// Message Tracking & Analytics for ChatTab

export interface MessageView {
  messageId: number;
  viewedAt: number;
  threadId: string;
}

export interface TypingIndicator {
  userId: string;
  threadId: string;
  startedAt: number;
  displayName: string;
}

export interface MessageReaction {
  messageId: number;
  emoji: string;
  userId: string;
  addedAt: number;
}

export class MessageTracker {
  private static readonly STORAGE_KEY_VIEWS = "reelsy_message_views";
  private static readonly STORAGE_KEY_TYPING = "reelsy_typing_indicators";
  private static readonly STORAGE_KEY_REACTIONS = "reelsy_message_reactions";
  private static readonly VIEW_THRESHOLD = 500; // ms - time message must be visible

  /**
   * Track when a message is viewed
   */
  static trackMessageView(messageId: number, threadId: string): void {
    try {
      const views = this.getMessageViews();
      views[messageId] = {
        messageId,
        viewedAt: Date.now(),
        threadId,
      };
      localStorage.setItem(this.STORAGE_KEY_VIEWS, JSON.stringify(views));
    } catch (e) {
      console.error("Error tracking message view:", e);
    }
  }

  /**
   * Get all tracked message views
   */
  static getMessageViews(): Record<number, MessageView> {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY_VIEWS);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  }

  /**
   * Get view time for a specific message
   */
  static getMessageViewTime(messageId: number): number | null {
    const views = this.getMessageViews();
    return views[messageId]?.viewedAt || null;
  }

  /**
   * Add typing indicator
   */
  static addTypingIndicator(
    userId: string,
    threadId: string,
    displayName: string
  ): void {
    try {
      const indicators = this.getTypingIndicators();
      indicators[userId] = {
        userId,
        threadId,
        startedAt: Date.now(),
        displayName,
      };
      localStorage.setItem(this.STORAGE_KEY_TYPING, JSON.stringify(indicators));
    } catch (e) {
      console.error("Error adding typing indicator:", e);
    }
  }

  /**
   * Remove typing indicator
   */
  static removeTypingIndicator(userId: string): void {
    try {
      const indicators = this.getTypingIndicators();
      delete indicators[userId];
      localStorage.setItem(this.STORAGE_KEY_TYPING, JSON.stringify(indicators));
    } catch (e) {
      console.error("Error removing typing indicator:", e);
    }
  }

  /**
   * Get all active typing indicators (last 3 seconds)
   */
  static getTypingIndicators(): Record<string, TypingIndicator> {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY_TYPING);
      const indicators = saved ? JSON.parse(saved) : {};
      const now = Date.now();
      
      // Clean up expired indicators (older than 3 seconds)
      Object.keys(indicators).forEach((key) => {
        if (now - indicators[key].startedAt > 3000) {
          delete indicators[key];
        }
      });
      
      if (Object.keys(indicators).length !== Object.keys(saved ? JSON.parse(saved) : {}).length) {
        localStorage.setItem(this.STORAGE_KEY_TYPING, JSON.stringify(indicators));
      }
      
      return indicators;
    } catch (e) {
      return {};
    }
  }

  /**
   * Add reaction to a message
   */
  static addReaction(
    messageId: number,
    emoji: string,
    userId: string
  ): void {
    try {
      const reactions = this.getReactions();
      const key = `${messageId}_${emoji}`;
      
      if (!reactions[key]) {
        reactions[key] = [];
      }
      
      if (!reactions[key].some((r) => r.userId === userId)) {
        reactions[key].push({
          messageId,
          emoji,
          userId,
          addedAt: Date.now(),
        });
      }
      
      localStorage.setItem(this.STORAGE_KEY_REACTIONS, JSON.stringify(reactions));
    } catch (e) {
      console.error("Error adding reaction:", e);
    }
  }

  /**
   * Remove reaction from a message
   */
  static removeReaction(
    messageId: number,
    emoji: string,
    userId: string
  ): void {
    try {
      const reactions = this.getReactions();
      const key = `${messageId}_${emoji}`;
      
      if (reactions[key]) {
        reactions[key] = reactions[key].filter((r) => r.userId !== userId);
        if (reactions[key].length === 0) {
          delete reactions[key];
        }
      }
      
      localStorage.setItem(this.STORAGE_KEY_REACTIONS, JSON.stringify(reactions));
    } catch (e) {
      console.error("Error removing reaction:", e);
    }
  }

  /**
   * Get all reactions for a message
   */
  static getMessageReactions(messageId: number): Record<string, MessageReaction[]> {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY_REACTIONS);
      const reactions = saved ? JSON.parse(saved) : {};
      
      const messageReactions: Record<string, MessageReaction[]> = {};
      Object.keys(reactions).forEach((key) => {
        const [mId] = key.split("_");
        if (parseInt(mId) === messageId) {
          messageReactions[key] = reactions[key];
        }
      });
      
      return messageReactions;
    } catch (e) {
      return {};
    }
  }

  /**
   * Get all reactions
   */
  static getReactions(): Record<string, MessageReaction[]> {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY_REACTIONS);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  }

  /**
   * Clear all tracking data for a thread
   */
  static clearThreadData(threadId: string): void {
    try {
      const views = this.getMessageViews();
      Object.keys(views).forEach((key) => {
        if (views[parseInt(key)]?.threadId === threadId) {
          delete views[parseInt(key)];
        }
      });
      localStorage.setItem(this.STORAGE_KEY_VIEWS, JSON.stringify(views));
    } catch (e) {
      console.error("Error clearing thread data:", e);
    }
  }

  /**
   * Get analytics for a thread
   */
  static getThreadAnalytics(threadId: string) {
    const views = this.getMessageViews();
    const reactions = this.getReactions();
    
    const messageViews = Object.values(views).filter((v) => v.threadId === threadId);
    const messageReactions = Object.values(reactions).flat();
    
    return {
      totalViewsInThread: messageViews.length,
      totalReactionsInThread: messageReactions.length,
      averageViewTime: messageViews.length > 0
        ? messageViews.reduce((sum, v) => sum + (Date.now() - v.viewedAt), 0) / messageViews.length
        : 0,
      mostRecentViewTime: messageViews.length > 0
        ? Math.max(...messageViews.map((v) => v.viewedAt))
        : null,
    };
  }
}

export default MessageTracker;
