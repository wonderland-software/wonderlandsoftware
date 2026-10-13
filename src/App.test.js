import { render, screen, cleanup } from '@testing-library/react';
import App from './App';
import { MAILTO } from './meta.mjs';

jest.mock('@chenglou/pretext', () => ({
  prepareWithSegments: () => ({}),
  layoutNextLineRange: () => null,
  materializeLineRange: () => ({ text: '', width: 0 }),
}));

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = () => null;
  window.matchMedia = (query) => ({
    matches: /prefers-reduced-motion:\s*reduce/.test(query),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
});

afterEach(() => {
  cleanup();
  window.history.pushState({}, '', '/');
});

function renderAt(path) {
  window.history.pushState({}, '', path);
  return render(<App />);
}

test('home keeps the Vibrate hero and restores studio content', () => {
  renderAt('/');

  expect(screen.getByRole('heading', { name: 'Currently building Vibrate' })).toBeInTheDocument();
  expect(screen.getByAltText('Vibrate logo')).toBeInTheDocument();
  expect(screen.getByText('Austin, Texas')).toBeInTheDocument();
  expect(screen.getByText('Trusted by')).toBeInTheDocument();
  expect(screen.getByAltText('Meta')).toBeInTheDocument();
  expect(screen.getByAltText('Servy')).toBeInTheDocument();
  expect(screen.getByAltText('The Gear Room')).toBeInTheDocument();
  expect(screen.getByAltText('MFJ')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Strategy Conversations.' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Design & Development.' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Integration & Deployment.' })).toBeInTheDocument();
  expect(screen.getByText(/what it doesn't/)).toBeInTheDocument();
  expect(
    screen.getByText(/custom software studio based in Austin,\s+Texas/)
  ).toBeInTheDocument();
  expect(
    screen.queryByText('Wonderland Software is based in Austin, Texas.')
  ).not.toBeInTheDocument();

  expect(screen.getByRole('link', { name: 'About the Vibrate app' })).toHaveAttribute(
    'href',
    '/vibrate/'
  );
  expect(screen.queryByRole('link', { name: /email tag@wonderland\.software/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /visit vibrate\.world/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /testflight/i })).not.toBeInTheDocument();
  expect(document.querySelector('a[href*="testflight"]')).toBeNull();
});

test('about is only the founder', () => {
  renderAt('/about/');

  expect(screen.getByRole('heading', { name: 'Tag Locklar' })).toBeInTheDocument();
  expect(screen.getByText('Tag Locklar is the founder of Wonderland Software.')).toBeInTheDocument();
  expect(screen.queryByText('Trusted by')).not.toBeInTheDocument();
  expect(screen.queryByText(/place pin/)).not.toBeInTheDocument();
  expect(screen.queryByText('Austin, TX')).not.toBeInTheDocument();
  expect(document.title).toBe('Tag Locklar, founder | Wonderland Software');
});

test('vibrate page has the product details and no TestFlight button', () => {
  renderAt('/vibrate');

  expect(screen.getByRole('heading', { name: 'Vibrate' })).toBeInTheDocument();
  expect(
    screen.getByText('Share your current vibe with a place pin, ratings, and friends.')
  ).toBeInTheDocument();
  expect(screen.getByText(/It is on TestFlight/)).toBeInTheDocument();
  const product = screen.getByRole('link', { name: /visit vibrate\.world/i });
  expect(product).toHaveAttribute('href', 'https://vibrate.world');
  expect(product).toHaveAttribute('target', '_blank');
  expect(product).toHaveAttribute('rel', 'noopener noreferrer');
  expect(screen.queryByRole('link', { name: /testflight/i })).not.toBeInTheDocument();
  expect(document.querySelector('a[href*="testflight"]')).toBeNull();
  expect(screen.queryByText('Trusted by')).not.toBeInTheDocument();
  expect(screen.queryByText(/Strategy Conversations/)).not.toBeInTheDocument();
});

test('contact has the mailto and Austin', () => {
  renderAt('/contact/');

  expect(screen.getByRole('heading', { name: 'Contact' })).toBeInTheDocument();
  expect(screen.getByText('Austin, TX')).toBeInTheDocument();
  const contact = screen.getByRole('link', { name: /email tag@wonderland\.software/i });
  expect(contact).toHaveAttribute('href', MAILTO);
  expect(contact).not.toHaveAttribute('target');
  expect(screen.queryByText(/place pin/)).not.toBeInTheDocument();
});

test('shared nav and footer are real links on every page', () => {
  renderAt('/about');

  expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
  expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about/');
  expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('link', { name: 'Vibrate' })).toHaveAttribute('href', '/vibrate/');
  expect(screen.getByRole('link', { name: 'Contact' })).toHaveAttribute('href', '/contact/');

  const privacy = screen.getByRole('link', { name: 'Privacy policy' });
  expect(privacy).toHaveAttribute('href', 'https://vibrate.world/privacy');
  expect(privacy).toHaveAttribute('target', '_blank');
  expect(privacy).toHaveAttribute('rel', 'noopener noreferrer');

  const terms = screen.getByRole('link', { name: 'Terms of service' });
  expect(terms).toHaveAttribute('href', 'https://vibrate.world/terms');
  expect(terms).toHaveAttribute('rel', 'noopener noreferrer');

  const x = screen.getByRole('link', { name: 'Vibrate on X' });
  expect(x).toHaveAttribute('href', 'https://x.com/getvibrate');
  expect(x).toHaveAttribute('target', '_blank');
  expect(x).toHaveAttribute('rel', 'noopener noreferrer');

  const instagram = screen.getByRole('link', { name: 'Vibrate on Instagram' });
  expect(instagram).toHaveAttribute('href', 'https://www.instagram.com/getvibrate/');
  expect(instagram).toHaveAttribute('target', '_blank');
  expect(instagram).toHaveAttribute('rel', 'noopener noreferrer');
});
