/**
 * Helmet設定
 */
export const helmetConfig = {
  /** Content Security Policy */
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  
  /** Cross-Origin Embedder Policy */
  crossOriginEmbedderPolicy: false,
  
  /** DNS Prefetch Control */
  dnsPrefetchControl: true,
  
  /** Expect-CT */
  expectCt: {
    maxAge: 86400,
  },
  
  /** Feature Policy */
  featurePolicy: {
    features: {
      camera: ["'none'"],
      microphone: ["'none'"],
      geolocation: ["'none'"],
    },
  },
  
  /** Frameguard */
  frameguard: {
    action: 'deny',
  },
  
  /** Hide Powered By */
  hidePoweredBy: true,
  
  /** HSTS */
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  
  /** IE No Open */
  ieNoOpen: true,
  
  /** No Sniff */
  noSniff: true,
  
  /** Origin Agent Cluster */
  originAgentCluster: true,
  
  /** Permissions Policy */
  permissionsPolicy: {
    camera: [],
    microphone: [],
    geolocation: [],
  },
  
  /** Referrer Policy */
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
  
  /** XSS Filter */
  xssFilter: true,
} as const;
