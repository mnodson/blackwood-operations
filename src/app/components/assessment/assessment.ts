import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { Router } from '@angular/router';
import { AssessmentResultState, QuestionResponse } from '../../models/assessment-result-state.interface';

interface QuizOption {
  text: string;
  score: number;
}

interface QuizQuestion {
  id: string;
  question: string;
  category: string;
  icon: string;
  options: QuizOption[];
}

interface AssessmentResult {
  level: 'critical' | 'developing' | 'established' | 'optimized';
  title: string;
  summary: string;
  color: string;
  recommendations: string[];
}

@Component({
  selector: 'app-assessment',
  templateUrl: './assessment.html',
  styleUrl: './assessment.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TitleCasePipe]
})
export class AssessmentComponent {
  private readonly router = inject(Router);
  protected readonly quizStarted = signal(false);
  protected readonly currentQuestionIndex = signal(0);
  protected readonly answers = signal<Map<string, number>>(new Map());
  protected readonly showResults = signal(false);
  protected readonly isAnimating = signal(false);

  protected readonly questions = signal<QuizQuestion[]>([
    {
      id: 'processes',
      question: 'How well documented are your core business processes?',
      category: 'Process Maturity',
      icon: 'description',
      options: [
        { text: 'What processes? We figure it out as we go', score: 1 },
        { text: 'Some tribal knowledge, mostly in people\'s heads', score: 2 },
        { text: 'Documented but often outdated', score: 3 },
        { text: 'Well-documented and regularly reviewed', score: 4 }
      ]
    },
    {
      id: 'technology',
      question: 'How integrated is your technology stack?',
      category: 'Technology',
      icon: 'hub',
      options: [
        { text: 'Spreadsheets and manual data entry everywhere', score: 1 },
        { text: 'Multiple disconnected tools with duplicate data', score: 2 },
        { text: 'Some integrations, but gaps remain', score: 3 },
        { text: 'Unified systems with automated data flow', score: 4 }
      ]
    },
    {
      id: 'metrics',
      question: 'How do you track operational performance?',
      category: 'Metrics & Visibility',
      icon: 'monitoring',
      options: [
        { text: 'We don\'t really track metrics consistently', score: 1 },
        { text: 'Basic metrics reviewed occasionally', score: 2 },
        { text: 'Regular reporting but reactive approach', score: 3 },
        { text: 'Real-time dashboards with proactive alerts', score: 4 }
      ]
    },
    {
      id: 'scalability',
      question: 'What happens when your business doubles in size?',
      category: 'Scalability',
      icon: 'trending_up',
      options: [
        { text: 'Honestly? Chaos. We\'d scramble to keep up', score: 1 },
        { text: 'We\'d need to hire proportionally more people', score: 2 },
        { text: 'Some growing pains but we could manage', score: 3 },
        { text: 'Our systems and processes can scale efficiently', score: 4 }
      ]
    },
    {
      id: 'compliance',
      question: 'How confident are you in your compliance posture?',
      category: 'Risk & Compliance',
      icon: 'verified_user',
      options: [
        { text: 'Compliance? We\'ll deal with it when audited', score: 1 },
        { text: 'We meet minimum requirements, barely', score: 2 },
        { text: 'Solid foundation but gaps in documentation', score: 3 },
        { text: 'Audit-ready with continuous monitoring', score: 4 }
      ]
    },
    {
      id: 'alignment',
      question: 'How aligned are your teams on priorities and goals?',
      category: 'Team Alignment',
      icon: 'groups',
      options: [
        { text: 'Different teams, different planets', score: 1 },
        { text: 'Leadership aligned, but it doesn\'t trickle down', score: 2 },
        { text: 'Generally aligned with occasional friction', score: 3 },
        { text: 'Clear OKRs with cross-functional collaboration', score: 4 }
      ]
    },
    {
      id: 'bottlenecks',
      question: 'How quickly can you identify and resolve operational bottlenecks?',
      category: 'Agility',
      icon: 'speed',
      options: [
        { text: 'We find out when customers complain', score: 1 },
        { text: 'Eventually, after some investigation', score: 2 },
        { text: 'We spot them but fixes take time', score: 3 },
        { text: 'Proactive monitoring with rapid response', score: 4 }
      ]
    }
  ]);

  protected readonly currentQuestion = computed(() =>
    this.questions()[this.currentQuestionIndex()]
  );

  protected readonly progress = computed(() =>
    ((this.currentQuestionIndex() + 1) / this.questions().length) * 100
  );

  protected readonly totalScore = computed(() => {
    let total = 0;
    this.answers().forEach(score => total += score);
    return total;
  });

  protected readonly maxScore = computed(() =>
    this.questions().length * 4
  );

  protected readonly scorePercentage = computed(() =>
    Math.round((this.totalScore() / this.maxScore()) * 100)
  );

  protected readonly result = computed<AssessmentResult>(() => {
    const percentage = this.scorePercentage();

    if (percentage <= 35) {
      return {
        level: 'critical',
        title: 'Foundation Building Needed',
        summary: 'Your operations have significant opportunities for improvement. The good news? Small changes can yield dramatic results at this stage.',
        color: '#e74c3c',
        recommendations: [
          'Start with documenting your top 5 critical processes',
          'Identify your biggest time-wasting manual tasks',
          'Establish basic KPIs for each department',
          'Consider a fractional COO to accelerate transformation'
        ]
      };
    } else if (percentage <= 55) {
      return {
        level: 'developing',
        title: 'Emerging Operations',
        summary: 'You\'ve built some operational foundation, but inconsistencies are likely causing friction and limiting growth.',
        color: '#f39c12',
        recommendations: [
          'Audit and update your existing process documentation',
          'Evaluate integration opportunities in your tech stack',
          'Implement regular operational review cadences',
          'Focus on cross-team communication frameworks'
        ]
      };
    } else if (percentage <= 80) {
      return {
        level: 'established',
        title: 'Solid Foundation',
        summary: 'Your operations are working well. Now it\'s about optimization and preparing for scale.',
        color: '#3498db',
        recommendations: [
          'Implement predictive analytics for proactive management',
          'Automate remaining manual processes',
          'Build redundancy into critical systems',
          'Develop leadership bench strength'
        ]
      };
    } else {
      return {
        level: 'optimized',
        title: 'Operational Excellence',
        summary: 'Impressive! Your operations are mature and scalable. Focus on maintaining excellence and continuous improvement.',
        color: '#27ae60',
        recommendations: [
          'Share best practices across the organization',
          'Explore AI/ML for advanced optimization',
          'Mentor other teams or business units',
          'Document your operational playbook for M&A readiness'
        ]
      };
    }
  });

  protected startQuiz(): void {
    this.quizStarted.set(true);
    this.currentQuestionIndex.set(0);
    this.answers.set(new Map());
    this.showResults.set(false);
  }

  protected selectAnswer(score: number): void {
    if (this.isAnimating()) return;

    this.isAnimating.set(true);

    const currentQ = this.currentQuestion();
    this.answers.update(map => {
      const newMap = new Map(map);
      newMap.set(currentQ.id, score);
      return newMap;
    });

    setTimeout(() => {
      if (this.currentQuestionIndex() < this.questions().length - 1) {
        this.currentQuestionIndex.update(i => i + 1);
      } else {
        this.showResults.set(true);
      }
      this.isAnimating.set(false);
    }, 400);
  }

  protected previousQuestion(): void {
    if (this.currentQuestionIndex() > 0) {
      this.currentQuestionIndex.update(i => i - 1);
    }
  }

  protected restartQuiz(): void {
    this.quizStarted.set(false);
    this.showResults.set(false);
    this.currentQuestionIndex.set(0);
    this.answers.set(new Map());
  }

  protected navigateToContact(): void {
    const responses: QuestionResponse[] = [];
    const answersMap = this.answers();
    const questions = this.questions();

    for (const question of questions) {
      const selectedScore = answersMap.get(question.id);
      if (selectedScore !== undefined) {
        const selectedOption = question.options.find(opt => opt.score === selectedScore);
        responses.push({
          questionId: question.id,
          question: question.question,
          category: question.category,
          selectedScore,
          selectedAnswer: selectedOption?.text ?? ''
        });
      }
    }

    const result = this.result();
    const assessmentResult: AssessmentResultState = {
      scorePercentage: this.scorePercentage(),
      level: result.level,
      title: result.title,
      summary: result.summary,
      recommendations: result.recommendations,
      responses
    };

    this.router.navigate(['/contact'], { state: { assessmentResult } });
  }
}
