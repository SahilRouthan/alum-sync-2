import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, CheckCheck, MessageSquare, Send } from "lucide-react";
import { api } from "../../services/apiClient";
import { supabase } from "../../services/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Avatar, EmptyState, LoadingSpinner, PageHeader } from "../../components/app/UI";

export default function MessagesPage() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const loadConversations = async (selectId = null) => {
    try {
      const res = await api.get("/messages/conversations");
      const list = res.conversations || [];
      setConversations(list);

      const targetId = selectId || searchParams.get("conversation");
      if (targetId) {
        const match = list.find((c) => c.id === targetId);
        if (match) selectConversation(match);
      } else if (!activeConv && list.length > 0) {
        selectConversation(list[0]);
      }
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = async (conv) => {
    setActiveConv(conv);
    try {
      const res = await api.get(`/messages/conversations/${conv.id}`);
      setMessages(res.messages || []);
      setConversations((prev) =>
        prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c))
      );
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  // Realtime subscription for incoming messages in the active conversation
  useEffect(() => {
    if (!supabase || !activeConv?.id) return;

    const channel = supabase
      .channel(`conv:${activeConv.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeConv.id}`,
        },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
          if (payload.new.receiver_id === profile?.id) {
            api.patch(`/messages/conversations/${activeConv.id}/read`).catch(() => {});
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConv?.id, profile?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || !activeConv) return;
    setSending(true);
    try {
      const res = await api.post(`/messages/conversations/${activeConv.id}`, { content: text });
      setMessages((prev) => {
        if (prev.some((m) => m.id === res.message.id)) return prev;
        return [...prev, res.message];
      });
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConv.id
            ? { ...c, last_message_text: res.message.content, last_message_at: res.message.created_at }
            : c
        )
      );
      setText("");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSending(false);
    }
  };

  if (loading) return <LoadingSpinner label="Loading conversations..." />;

  return (
    <div>
      <PageHeader
        title="Messages"
        subtitle="Communicate directly with your mentors and mentees in real time."
      />

      {conversations.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No conversations yet"
          description="Conversations are created automatically when a mentorship request is accepted, or when you message an alumnus."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-3 min-h-[540px]">
          {/* Conversation List */}
          <div className="border-r border-slate-200 divide-y divide-slate-100 overflow-y-auto max-h-[600px]">
            {conversations.map((conv) => {
              const selected = activeConv?.id === conv.id;
              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => selectConversation(conv)}
                  className={`w-full text-left p-4 flex items-center gap-3 transition-colors ${
                    selected ? "bg-brand-50/70" : "hover:bg-slate-50"
                  }`}
                >
                  <Avatar name={conv.otherUser?.full_name || "User"} src={conv.otherUser?.avatar_url} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-900 truncate">
                        {conv.otherUser?.full_name || "Member"}
                      </span>
                      {conv.unreadCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-brand-600 text-white text-[10px] font-bold">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {conv.last_message_text || "Start your conversation"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Chat Panel */}
          <div className="md:col-span-2 flex flex-col h-[600px]">
            {activeConv ? (
              <>
                <div className="px-5 py-3.5 border-b border-slate-200 flex items-center gap-3 bg-slate-50/60">
                  <Avatar
                    name={activeConv.otherUser?.full_name || "User"}
                    src={activeConv.otherUser?.avatar_url}
                    size="sm"
                  />
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {activeConv.otherUser?.full_name || "Member"}
                    </p>
                    <p className="text-xs text-slate-500 capitalize">{activeConv.otherUser?.role || ""}</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50/40">
                  {messages.length === 0 ? (
                    <p className="text-center text-xs text-slate-400 mt-10">
                      No messages yet. Say hello to start the conversation!
                    </p>
                  ) : (
                    messages.map((m) => {
                      const isMine = m.sender_id === profile?.id;
                      return (
                        <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                              isMine
                                ? "bg-brand-600 text-white rounded-br-sm"
                                : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm"
                            }`}
                          >
                            <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                            <div
                              className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                                isMine ? "text-brand-200" : "text-slate-400"
                              }`}
                            >
                              <span>
                                {new Date(m.created_at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              {isMine &&
                                (m.is_read ? (
                                  <CheckCheck className="w-3.5 h-3.5" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                ))}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSend} className="p-4 border-t border-slate-200 bg-white flex gap-2">
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <button
                    type="submit"
                    disabled={sending || !text.trim()}
                    className="px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <Send className="w-4 h-4" /> Send
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
                Select a conversation to view messages
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
