export interface BrowserService {
  navigate(url: string): Promise<void>;
}
