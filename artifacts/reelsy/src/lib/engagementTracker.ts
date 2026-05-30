// Post Engagement Analytics for HomeTab

export interface PostEngagement {
  postId: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  bookmarkCount: number;
  firstViewTime: number;
  lastViewTime: number;
  engagementScore: number; // calculated metric
  engagementRate: number; // engagement/views percentage
}

export interface EngagementEvent {
  postId: string;
  eventType: "view" | "like" | "comment" | "repost" | "bookmark";
  timestamp: number;
  userId?: string;
}

export class EngagementTracker {
  private static readonly STORAGE_KEY_ENGAGEMENT = "reelsy_post_engagement";
  private static readonly STORAGE_KEY_EVENTS = "reelsy_engagement_events";

  /**
   * Record a post view
   */
  static recordView(postId: string): void {
    this.recordEvent(postId, "view");
    const engagements = this.getEngagements();
    
    if (!engagements[postId]) {
      engagements[postId] = {
        postId,
        viewCount: 0,
        likeCount: 0,
        commentCount: 0,
        repostCount: 0,
        bookmarkCount: 0,
        firstViewTime: Date.now(),
        lastViewTime: Date.now(),
        engagementScore: 0,
        engagementRate: 0,
      };
    }
    
    engagements[postId].viewCount++;
    engagements[postId].lastViewTime = Date.now();
    this.updateEngagementScore(engagements[postId]);
    
    this.saveEngagements(engagements);
  }

  /**
   * Record post engagement event
   */
  static recordEvent(
    postId: string,
    eventType: "view" | "like" | "comment" | "repost" | "bookmark",
    userId?: string
  ): void {
    try {
      const events = this.getEvents();
      events.push({
        postId,
        eventType,
        timestamp: Date.now(),
        userId,
      });
      
      // Keep only last 10000 events
      if (events.length > 10000) {
        events.splice(0, events.length - 10000);
      }
      
      localStorage.setItem(this.STORAGE_KEY_EVENTS, JSON.stringify(events));
    } catch (e) {
      console.error("Error recording engagement event:", e);
    }
  }

  /**
   * Record engagement action (like, comment, etc.)
   */
  static recordEngagement(
    postId: string,
    type: "like" | "comment" | "repost" | "bookmark"
  ): void {
    const engagements = this.getEngagements();
    
    if (!engagements[postId]) {
      engagements[postId] = {
        postId,
        viewCount: 0,
        likeCount: 0,
        commentCount: 0,
        repostCount: 0,
        bookmarkCount: 0,
        firstViewTime: Date.now(),
        lastViewTime: Date.now(),
        engagementScore: 0,
        engagementRate: 0,
      };
    }
    
    const engagement = engagements[postId];
    
    switch (type) {
      case "like":
        engagement.likeCount++;
        break;
      case "comment":
        engagement.commentCount++;
        break;
      case "repost":
        engagement.repostCount++;
        break;
      case "bookmark":
        engagement.bookmarkCount++;
        break;
    }
    
    this.updateEngagementScore(engagement);
    this.recordEvent(postId, type);
    this.saveEngagements(engagements);
  }

  /**
   * Calculate engagement score
   * Formula: (likes * 1 + comments * 2 + reposts * 3 + bookmarks * 1.5) / total interactions
   */
  private static updateEngagementScore(engagement: PostEngagement): void {
    const totalEngagements = 
      engagement.likeCount + 
      engagement.commentCount + 
      engagement.repostCount + 
      engagement.bookmarkCount;
    
    engagement.engagementScore = 
      (engagement.likeCount * 1 +
       engagement.commentCount * 2 +
       engagement.repostCount * 3 +
       engagement.bookmarkCount * 1.5) / Math.max(totalEngagements, 1);
    
    engagement.engagementRate = engagement.viewCount > 0 
      ? (totalEngagements / engagement.viewCount) * 100
      : 0;
  }

  /**
   * Get engagement data for a specific post
   */
  static getPostEngagement(postId: string): PostEngagement | null {
    const engagements = this.getEngagements();
    return engagements[postId] || null;
  }

  /**
   * Get all engagement data
   */
  static getEngagements(): Record<string, PostEngagement> {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY_ENGAGEMENT);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error("Error getting engagements:", e);
      return {};
    }
  }

  /**
   * Get all engagement events
   */
  static getEvents(): EngagementEvent[] {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY_EVENTS);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Error getting events:", e);
      return [];
    }
  }

  /**
   * Get engagement events for a specific post
   */
  static getPostEvents(postId: string): EngagementEvent[] {
    return this.getEvents().filter((e) => e.postId === postId);
  }

  /**
   * Get top engaged posts
   */
  static getTopEngagedPosts(limit: number = 10): PostEngagement[] {
    const engagements = this.getEngagements();
    return Object.values(engagements)
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, limit);
  }

  /**
   * Get posts by engagement rate
   */
  static getPostsByEngagementRate(limit: number = 10): PostEngagement[] {
    const engagements = this.getEngagements();
    return Object.values(engagements)
      .filter((e) => e.viewCount > 0)
      .sort((a, b) => b.engagementRate - a.engagementRate)
      .slice(0, limit);
  }

  /**
   * Get trending posts (high engagement in last 24 hours)
   */
  static getTrendingPosts(hoursBack: number = 24): PostEngagement[] {
    const events = this.getEvents();
    const cutoffTime = Date.now() - (hoursBack * 60 * 60 * 1000);
    
    const recentEvents = events.filter((e) => e.timestamp >= cutoffTime);
    const postEventCounts: Record<string, number> = {};
    
    recentEvents.forEach((e) => {
      postEventCounts[e.postId] = (postEventCounts[e.postId] || 0) + 1;
    });
    
    const engagements = this.getEngagements();
    return Object.entries(postEventCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([postId]) => engagements[postId])
      .filter(Boolean)
      .slice(0, 10);
  }

  /**
   * Get engagement timeline (events grouped by hour)
   */
  static getEngagementTimeline(
    postId: string,
    hoursBack: number = 24
  ): Record<string, number> {
    const events = this.getPostEvents(postId);
    const cutoffTime = Date.now() - (hoursBack * 60 * 60 * 1000);
    
    const timeline: Record<string, number> = {};
    
    events.filter((e) => e.timestamp >= cutoffTime).forEach((event) => {
      const date = new Date(event.timestamp);
      const hourKey = date.toISOString().slice(0, 13); // YYYY-MM-DDTHH
      timeline[hourKey] = (timeline[hourKey] || 0) + 1;
    });
    
    return timeline;
  }

  /**
   * Save engagements to storage
   */
  private static saveEngagements(engagements: Record<string, PostEngagement>): void {
    try {
      localStorage.setItem(this.STORAGE_KEY_ENGAGEMENT, JSON.stringify(engagements));
    } catch (e) {
      console.error("Error saving engagements:", e);
    }
  }

  /**
   * Clear old engagement data (older than specified days)
   */
  static clearOldData(daysBack: number = 30): void {
    try {
      const events = this.getEvents();
      const cutoffTime = Date.now() - (daysBack * 24 * 60 * 60 * 1000);
      const filtered = events.filter((e) => e.timestamp >= cutoffTime);
      localStorage.setItem(this.STORAGE_KEY_EVENTS, JSON.stringify(filtered));
    } catch (e) {
      console.error("Error clearing old data:", e);
    }
  }

  /**
   * Get engagement summary statistics
   */
  static getEngagementStats() {
    const engagements = this.getEngagements();
    const engagementArray = Object.values(engagements);
    
    if (engagementArray.length === 0) {
      return {
        totalPosts: 0,
        totalViews: 0,
        totalEngagements: 0,
        averageEngagementRate: 0,
        averageEngagementScore: 0,
      };
    }
    
    const totalViews = engagementArray.reduce((sum, e) => sum + e.viewCount, 0);
    const totalEngagements = engagementArray.reduce(
      (sum, e) => sum + e.likeCount + e.commentCount + e.repostCount + e.bookmarkCount,
      0
    );
    const averageEngagementRate = 
      engagementArray.reduce((sum, e) => sum + e.engagementRate, 0) / engagementArray.length;
    const averageEngagementScore = 
      engagementArray.reduce((sum, e) => sum + e.engagementScore, 0) / engagementArray.length;
    
    return {
      totalPosts: engagementArray.length,
      totalViews,
      totalEngagements,
      averageEngagementRate,
      averageEngagementScore,
    };
  }
}

export default EngagementTracker;
