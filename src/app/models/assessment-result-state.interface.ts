export interface QuestionResponse {
  questionId: string;
  question: string;
  category: string;
  selectedScore: number;
  selectedAnswer: string;
}

export interface AssessmentResultState {
  scorePercentage: number;
  level: 'critical' | 'developing' | 'established' | 'optimized';
  title: string;
  summary: string;
  recommendations: string[];
  responses: QuestionResponse[];
}
