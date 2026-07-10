import { withPasswordProtect } from '@tommyvez/passfort/next';

export const proxy = withPasswordProtect({
  paths: ['/admin', '/dashboard'],
});

export const config = {
  matcher: ['/admin', '/admin/:path*', '/dashboard', '/dashboard/:path*'],
};
