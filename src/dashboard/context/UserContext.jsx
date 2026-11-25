import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/apiClient";
import { roleHomePath } from "../../components/app/ProtectedRoute";

export const UserContext = createContext(null);

const AVATAR_COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ec4899"];

function getInitials(name = "User") {
  const parts = String(name || "U")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "U";
  return parts
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

function pickColor(seed = "") {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function mapAlumniRecord(person, index = 0) {
  const name = person.full_name || person.name || person.email || "Verified Alumni";
  const roleLabel =
    person.role ||
    [person.job_title, person.company].filter(Boolean).join(" @ ") ||
    "Verified Alumnus";
  const batchLabel =
    person.batch ||
    (person.graduation_year ? `Class of '${String(person.graduation_year).slice(-2)}` : "");
  const tags = Array.isArray(person.tags)
    ? person.tags
    : Array.isArray(person.skills)
      ? person.skills
      : [];

  return {
    ...person,
    name,
    email: person.email || "",
    avatar: person.avatar || getInitials(name),
    avatarColor: person.avatarColor || pickColor(person.id || name || String(index)),
    role: roleLabel,
    batch: batchLabel,
    tags,
  };
}

function mapDbJobToCard(job) {
  const typeLabelMap = {
    full_time: "Full-Time",
    internship: "Internship",
    referral: "Referral",
    part_time: "Part-Time",
    contract: "Contract",
  };
  const modeLabelMap = {
    remote: "Remote",
    hybrid: "Hybrid",
    onsite: "On-site",
  };
  const tags = [];
  if (job.job_type) tags.push({ type: "type", label: typeLabelMap[job.job_type] || job.job_type });
  if (job.work_mode) tags.push({ type: "mode", label: modeLabelMap[job.work_mode] || job.work_mode });
  if (job.salary_range) tags.push({ type: "salary", label: job.salary_range });

  return {
    id: job.id,
    icon: "💼",
    title: job.title,
    company: job.company,
    location: job.location || "Flexible",
    jobType: typeLabelMap[job.job_type] || job.job_type || "Opportunity",
    description: job.description,
    tags,
    postedBy: job.poster?.full_name || "Verified Alumni",
    application_url: job.application_url || null,
  };
}

function mapDbPostToFeed(post) {
  const authorName = post.author?.full_name || "AlumSync Member";
  return {
    id: post.id,
    author: authorName,
    role: post.author?.role ? String(post.author.role).toUpperCase() : "Member",
    batch: post.post_type ? post.post_type.replace(/_/g, " ") : "Update",
    content: post.title ? `${post.title} — ${post.content}` : post.content,
    likes: post.likes_count || 0,
    comments: post.comments_count || 0,
    likedByMe: Boolean(post.likedByMe),
    timestamp: post.created_at ? new Date(post.created_at).toLocaleDateString() : "Recent",
    isLive: true,
  };
}

function mapDbNotification(n) {
  const title = n.title || "Notification";
  return {
    id: n.id,
    name: title,
    message: n.message || "",
    avatar: getInitials(title),
    avatarColor: pickColor(n.id || title),
    read: Boolean(n.is_read),
    time: n.created_at ? new Date(n.created_at).toLocaleDateString() : "Now",
    isLive: true,
  };
}

export function UserProvider({ children }) {
  const { profile, roleProfile } = useAuth();
  const basePath = roleHomePath(profile?.role);

  const [mockProfile, setMockProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [trendingHashtags, setTrendingHashtags] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [jobStats, setJobStats] = useState(null);
  const [networkStats, setNetworkStats] = useState(null);
  const [alumniDirectory, setAlumniDirectory] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [mentorStats, setMentorStats] = useState(null);
  const [mentors, setMentors] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const userData = useMemo(() => {
    const fullName = profile?.full_name || mockProfile?.name || "AlumSync Member";
    const roleSubtitle =
      profile?.role === "admin"
        ? "Platform Administrator"
        : profile?.role === "alumni"
          ? [roleProfile?.job_title, roleProfile?.company].filter(Boolean).join(" @ ") || "Verified Alumni"
          : [roleProfile?.degree, roleProfile?.department].filter(Boolean).join(" — ") || "Student Portal";
    const university = roleProfile?.university || mockProfile?.university || "AlumSync Network";
    const batch = roleProfile?.graduation_year
      ? `Batch of ${roleProfile.graduation_year}`
      : mockProfile?.batch || "";

    return {
      id: profile?.id || mockProfile?.id || "me",
      name: fullName,
      email: profile?.email || "",
      portalRole: profile?.role || "student",
      role: roleSubtitle,
      university,
      batch,
      avatar: getInitials(fullName),
      stats: mockProfile?.stats || { connections: 0, profileViews: 0 },
    };
  }, [profile, roleProfile, mockProfile]);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Load baseline seed data from /data/db.json
      let fallbackData = null;
      try {
        const response = await fetch("/data/db.json");
        if (response.ok) {
          fallbackData = await response.json();
          setMockProfile(fallbackData.profile || null);
          setPosts(fallbackData.posts || []);
          setSuggestions(fallbackData.suggestions || []);
          setUpcomingEvents(fallbackData.upcomingEvents || []);
          setTrendingHashtags(fallbackData.trendingHashtags || []);
          setJobs(fallbackData.jobs || []);
          setJobStats(fallbackData.stats || null);
          setNetworkStats(fallbackData.networkStats || null);
          setAlumniDirectory(fallbackData.alumniDirectory || []);
          setNotifications(fallbackData.notifications || []);
          setMentorStats(fallbackData.mentorStats || null);
          setMentors(fallbackData.mentors || []);
        }
      } catch {
        // silent fallback if static seed missing
      }

      // 2. Overlay live backend records where available
      const [alumniRes, jobsRes, postsRes, eventsRes, notifRes] = await Promise.allSettled([
        api.get("/v1/alumni"),
        api.get("/jobs"),
        api.get("/community/posts"),
        api.get("/events"),
        api.get("/notifications"),
      ]);

      if (alumniRes.status === "fulfilled" && Array.isArray(alumniRes.value?.data) && alumniRes.value.data.length > 0) {
        const formatted = alumniRes.value.data.map(mapAlumniRecord);
        setAlumniDirectory(formatted);

        const liveMentors = formatted
          .filter((a) => a.is_available_for_mentorship !== false)
          .map((a, idx) => ({
            id: a.id,
            user_id: a.user_id,
            name: a.name,
            role: a.role,
            batch: a.batch || "Verified Mentor",
            avatar: a.avatar,
            avatarColor: a.avatarColor || pickColor(a.name + idx),
            skills: a.tags.length > 0 ? a.tags : ["Mentorship", "Career Guidance"],
            mentees: a.max_mentees || 3,
            rating: "4.9",
            availability: a.is_available_for_mentorship ? "Open" : "Limited",
            raw: a,
          }));
        if (liveMentors.length > 0) {
          setMentors(liveMentors);
        }
      }

      if (jobsRes.status === "fulfilled" && Array.isArray(jobsRes.value?.jobs) && jobsRes.value.jobs.length > 0) {
        setJobs(jobsRes.value.jobs.map(mapDbJobToCard));
      }

      if (postsRes.status === "fulfilled" && Array.isArray(postsRes.value?.posts) && postsRes.value.posts.length > 0) {
        setPosts(postsRes.value.posts.map(mapDbPostToFeed));
      }

      if (eventsRes.status === "fulfilled" && Array.isArray(eventsRes.value?.events) && eventsRes.value.events.length > 0) {
        setUpcomingEvents(
          eventsRes.value.events.slice(0, 4).map((ev) => {
            const d = ev.event_date ? new Date(ev.event_date) : new Date();
            return {
              id: ev.id,
              day: String(d.getDate()).padStart(2, "0"),
              month: d.toLocaleString("en-US", { month: "short" }).toUpperCase(),
              title: ev.title,
              location: ev.is_virtual ? "Virtual" : ev.location || "Campus",
              time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            };
          })
        );
      }

      if (notifRes.status === "fulfilled" && Array.isArray(notifRes.value?.notifications) && notifRes.value.notifications.length > 0) {
        setNotifications(notifRes.value.notifications.map(mapDbNotification));
      } else if (!fallbackData) {
        setNotifications([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData, profile?.id]);

  const markNotificationRead = useCallback(async (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    if (typeof id === "string" && id.includes("-") && id.length > 20) {
      await api.patch(`/notifications/${id}/read`).catch(() => {});
    }
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await api.patch("/notifications/read-all").catch(() => {});
  }, []);

  const createFeedPost = useCallback(
    async (content) => {
      const trimmed = String(content || "").trim();
      if (!trimmed) return null;
      const res = await api.post("/community/posts", {
        content: trimmed,
        post_type: "discussion",
      });
      if (res?.post) {
        const mapped = mapDbPostToFeed({
          ...res.post,
          author: { full_name: userData.name, role: userData.portalRole },
        });
        setPosts((prev) => [mapped, ...prev]);
        return mapped;
      }
      return null;
    },
    [userData.name, userData.portalRole]
  );

  const togglePostLike = useCallback(async (postId) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const nextLiked = !p.likedByMe;
        return {
          ...p,
          likedByMe: nextLiked,
          likes: Math.max(0, (p.likes || 0) + (nextLiked ? 1 : -1)),
        };
      })
    );
    if (typeof postId === "string" && postId.includes("-") && postId.length > 20) {
      await api.post(`/community/posts/${postId}/like`).catch(() => {});
    }
  }, []);

  return (
    <UserContext.Provider
      value={{
        basePath,
        userData,
        posts,
        suggestions,
        upcomingEvents,
        trendingHashtags,
        jobs,
        jobStats,
        networkStats,
        alumniDirectory,
        notifications,
        markNotificationRead,
        markAllNotificationsRead,
        createFeedPost,
        togglePostLike,
        mentorStats,
        mentors,
        searchQuery,
        setSearchQuery,
        loading,
        refreshDashboard: loadDashboardData,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}
