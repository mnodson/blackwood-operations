export type PlanId = 'essential' | 'practice' | 'group';

export interface Plan {
  id: PlanId;
  name: string;
  /** One-time price in whole US dollars for the document update. */
  price: number;
  /** Optional monitoring add-on, in whole US dollars per month. */
  monitoringPrice: number;
  scope: string;
  features: string[];
  featured: boolean;
}

/** Single source of truth for the plans shown on the pricing cards and the signup page. */
export const PLANS: Plan[] = [
  {
    id: 'essential',
    name: 'Essential',
    price: 395,
    monitoringPrice: 39,
    scope: 'One practice, one location, one state.',
    features: [
      'Custom notice drafted for your practice',
      'Reviewed against current federal and state rules',
      'Note explaining what changed and why',
      'All delivery formats'
    ],
    featured: false
  },
  {
    id: 'practice',
    name: 'Practice',
    price: 995,
    monitoringPrice: 99,
    scope: 'Everything in Essential, plus:',
    features: ['Up to five locations', 'Multi-state coverage', 'Spanish-language versions'],
    featured: true
  },
  {
    id: 'group',
    name: 'Group',
    price: 2795,
    monitoringPrice: 299,
    scope: 'Everything in Practice, plus:',
    features: ['Up to five practices', 'Unlimited locations'],
    featured: false
  }
];

export function findPlan(id: string | null | undefined): Plan | undefined {
  return PLANS.find(plan => plan.id === id);
}
