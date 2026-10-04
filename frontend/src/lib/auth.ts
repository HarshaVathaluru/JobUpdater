import { api } from './api-client';
import Cookies from 'js-cookie';
import { User } from '@/types';

export const auth = {
  async login(email: string, password: string): Promise<User> {
    const res: any = await api.post('/auth/login', { email, password });
    const token = res.access_token || res.token || res.data?.access_token || res.data?.token;
    const user = res.user || res.data?.user;

    if (token) {
      Cookies.set('token', token, { expires: 7 });
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', token);
      }
    }

    return user;
  },

  async register(email: string, password: string, firstName?: string, lastName?: string): Promise<User> {
    const res: any = await api.post('/auth/register', { email, password, firstName, lastName });
    const token = res.access_token || res.token || res.data?.access_token || res.data?.token;
    const user = res.user || res.data?.user || res;

    if (token) {
      Cookies.set('token', token, { expires: 7 });
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', token);
      }
    }

    return user;
  },

  logout(): void {
    Cookies.remove('token');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
  },

  async getProfile(): Promise<User> {
    const res: any = await api.get('/auth/profile');
    return res.data || res;
  },

  isAuthenticated(): boolean {
    const token = Cookies.get('token') || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    return !!token;
  },
};
