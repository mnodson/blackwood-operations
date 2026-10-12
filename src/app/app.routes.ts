import { Routes } from '@angular/router';
import { HomePage } from './pages/home/home';
import { LeadershipPage } from './pages/leadership-page/leadership-page';
import { ContactPage } from './pages/contact/contact';

export const routes: Routes = [
  {
    path: '',
    component: HomePage
  },
  {
    path: 'leadership',
    component: LeadershipPage
  },
  {
    path: 'contact',
    component: ContactPage
  },
  {
    path: 'compliance',
    loadComponent: () =>
      import('./pages/compliance/compliance').then(m => m.CompliancePage)
  },
  {
    path: 'compliance/signup',
    loadComponent: () =>
      import('./pages/compliance-signup/compliance-signup').then(m => m.ComplianceSignupPage)
  },
  {
    path: 'compliance/signup/success',
    loadComponent: () =>
      import('./pages/compliance-signup-success/compliance-signup-success').then(
        m => m.ComplianceSignupSuccessPage
      )
  },
  {
    path: 'privacy-changes',
    loadComponent: () =>
      import('./pages/privacy-changes/privacy-changes').then(m => m.PrivacyChangesPage)
  },
  {
    path: 'privacy',
    loadComponent: () => import('./pages/privacy/privacy').then(m => m.PrivacyPage)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
