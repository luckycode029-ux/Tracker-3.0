
export interface UserProfile {
  id: string;
  credits: number;
  last_daily_bonus: string;
}

export interface Video {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  position: number;
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  videoCount: number;
  lastAccessed: number;
}

export interface VideoProgress {
  videoId: string;
  playlistId: string;
  completed: boolean;
  updatedAt: number;
}

export interface VideoNotes {
  videoId: string;
  playlistId: string;
  topic: string;
  source: string;
  keyTakeaways: string[];
  concepts: { term: string; meaning: string }[];
  mustRemember: string[];
  formulaOrLogic?: {
    formula?: string;
    structure?: string;
    condition?: string;
    whenToUse?: string;
  };
  summary: string;
  createdAt: number;
}

export interface YTAPIResponse {
  items: Array<{
    snippet: {
      title: string;
      description: string;
      thumbnails: {
        medium: { url: string };
        default?: { url: string };
        high?: { url: string };
      };
      channelTitle: string;
      resourceId: { videoId: string };
      position: number;
    };
  }>;
  nextPageToken?: string;
  pageInfo: {
    totalResults: number;
  };
  error?: {
    message: string;
  };
}

export interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface VideoTest {
  videoId: string;
  playlistId: string;
  questions: Question[];
  createdAt: number;
}

export interface TestResult {
  videoId: string;
  playlistId: string;
  score: number;
  totalQuestions: number;
  userAnswers: number[];
  createdAt: number;
  performanceLevel?: 'Needs Improvement' | 'Good' | 'Excellent';
}


