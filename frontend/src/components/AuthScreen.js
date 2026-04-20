import React, { useEffect, useMemo, useRef, useState } from 'react';
import LabFlowLogo from './LabFlowLogo';
import LandingCanvas from './LandingCanvas';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5003';

function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }
    const existing = document.querySelector('script[data-google-gsi="1"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('google_script_load_failed')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleGsi = '1';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('google_script_load_failed'));
    document.head.appendChild(script);
  });
}

export default function AuthScreen({ onAuth, oauthError }) {
  const googleButtonRef = useRef(null);
  const [googleReady, setGoogleReady] = useState(false);
  const [authError, setAuthError] = useState('');

  const displayError = useMemo(() => {
    if (authError) return authError;
    if (oauthError) return `Sign-in failed: ${String(oauthError).replace(/_/g, ' ')}`;
    return '';
  }, [authError, oauthError]);

  useEffect(() => {
    let mounted = true;

    async function initGoogleSignIn() {
      try {
        const cfgRes = await fetch(`${API_BASE_URL}/api/auth/google/client`);
        const cfgData = await cfgRes.json().catch(() => ({}));
        if (!cfgRes.ok || !cfgData.client_id) {
          throw new Error(cfgData.error || 'google_oauth_not_configured');
        }

        await loadGoogleScript();
        if (!mounted || !googleButtonRef.current) return;

        window.google.accounts.id.initialize({
          client_id: cfgData.client_id,
          callback: async (response) => {
            try {
              setAuthError('');
              const loginRes = await fetch(`${API_BASE_URL}/api/auth/google/id-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_token: response.credential }),
              });
              const loginData = await loginRes.json().catch(() => ({}));
              if (!loginRes.ok || !loginData.token || !loginData.user) {
                throw new Error(loginData.error || 'google_login_failed');
              }
              localStorage.setItem('labflow_token', loginData.token);
              onAuth(loginData.token, loginData.user);
            } catch (err) {
              setAuthError(`Google sign-in failed: ${err.message || 'unknown_error'}`);
            }
          },
          auto_select: false,
        });

        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          width: 320,
          logo_alignment: 'left',
        });

        // Offer One Tap if the user has an active Google session.
        window.google.accounts.id.prompt();

        setGoogleReady(true);
      } catch (err) {
        if (!mounted) return;
        setAuthError(`Google sign-in unavailable: ${err.message || 'configuration_error'}`);
      }
    }

    initGoogleSignIn();
    return () => {
      mounted = false;
    };
  }, [onAuth]);

  const btnStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: '13px 0',
    borderRadius: 10,
    border: '1px solid #d1d5db',
    background: 'white',
    color: '#374151',
    fontWeight: 600,
    fontSize: 15,
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'box-shadow 0.15s',
    width: '100%',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        position: 'relative',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #0f766e 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <LandingCanvas />
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          background: 'white',
          borderRadius: 20,
          padding: '44px 36px',
          width: '100%',
          maxWidth: 400,
          boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
        }}
      >
        {/* Logo + title */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <LabFlowLogo style={{ height: 48, marginBottom: 12 }} />
          <h1
            style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 800,
              background: 'linear-gradient(90deg,#0f766e,#1d4ed8)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            LabFlow
          </h1>
          <p style={{ margin: '8px 0 0', color: '#6b7280', fontSize: 14 }}>
            Sign in to your lab workspace
          </p>
        </div>

        {displayError && (
          <div style={{
            marginBottom: 16,
            padding: '10px 14px',
            borderRadius: 8,
            background: '#fef2f2',
            color: '#b91c1c',
            fontSize: 13,
            border: '1px solid #fecaca',
            textAlign: 'center',
          }}>
            <strong>{displayError}</strong>
          </div>
        )}

        {/* OAuth buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div
            style={{
              ...btnStyle,
              padding: '10px 0',
              minHeight: 52,
            }}
          >
            <div ref={googleButtonRef} style={{ width: '100%', display: 'flex', justifyContent: 'center' }} />
          </div>

          {!googleReady && (
            <div style={{ fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
              Preparing Google sign-in...
            </div>
          )}
        </div>

        <p style={{ marginTop: 28, textAlign: 'center', fontSize: 12, color: '#9ca3af' }}>
          Your account is created automatically on first sign-in.
        </p>
      </div>
    </div>
  );
}

