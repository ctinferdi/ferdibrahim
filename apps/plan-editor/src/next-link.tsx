import React from 'react';
export default function Link({ href, prefetch, replace, scroll, ...props }: any) {
  return <a {...props} href={typeof href === 'string' ? href : href?.pathname} />;
}
