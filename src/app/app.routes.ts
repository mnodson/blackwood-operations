import { Routes } from '@angular/router';
import { HomePage } from './pages/home/home';
import { LeadershipPage } from './pages/leadership-page/leadership-page';

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
    path: '**',
    redirectTo: ''
  }
];
