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
    path: '**',
    redirectTo: ''
  }
];
