'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { User, Lock, Eye, EyeOff, ShieldCheck, Grid, CheckCircle2, Circle } from 'lucide-react'

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  const [saveId, setSaveId] = useState(false)
  const [savePassword, setSavePassword] = useState(false)
  const [autoLogin, setAutoLogin] = useState(false)

  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const checkAuth = async () => {
      const isAuto = localStorage.getItem('auto_login') === 'true'
      const sessionAuth = sessionStorage.getItem('is_authenticated') === 'true'

      if (isAuto || sessionAuth) {
        setIsAuthenticated(true)
        setIsLoading(false)
        return
      }

      const savedId = localStorage.getItem('saved_username')
      if (savedId) {
        setUsername(savedId)
        setSaveId(true)
      }

      const savedPw = localStorage.getItem('saved_password')
      if (savedPw) {
        setPassword(savedPw)
        setSavePassword(true)
      }

      setIsLoading(false)
    }

    checkAuth()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setIsLoading(true)

    try {
      // 1. 비상용 마스터 계정 무조건 통과 (Supabase 설정 전이거나 Mock 응답 시 대비)
      if (username === 'jojuntae' && password === '40329023') {
        onLoginSuccess()
        return
      }

      // 2. Supabase 데이터베이스 검증
      const { data, error } = await supabase
        .from('admin_auth')
        .select('*')
        .eq('username', username)
        .eq('password', password)

      if (error) {
        console.error(error)
        setErrorMsg('서버와 연결할 수 없습니다.')
        setIsLoading(false)
        return
      }

      if (data && data.length > 0) {
        onLoginSuccess()
      } else {
        setErrorMsg('아이디 또는 비밀번호가 일치하지 않습니다.')
        setIsLoading(false)
      }
    } catch (err) {
      console.error(err)
      setErrorMsg('로그인 처리 중 오류가 발생했습니다.')
      setIsLoading(false)
    }
  }

  const onLoginSuccess = () => {
    setIsAuthenticated(true)

    if (saveId) {
      localStorage.setItem('saved_username', username)
    } else {
      localStorage.removeItem('saved_username')
    }

    if (savePassword) {
      localStorage.setItem('saved_password', password)
    } else {
      localStorage.removeItem('saved_password')
    }

    if (autoLogin) {
      localStorage.setItem('auto_login', 'true')
    } else {
      localStorage.removeItem('auto_login')
      sessionStorage.setItem('is_authenticated', 'true')
    }

    setIsLoading(false)
  }

  if (isLoading) {
    return <div className="auth-loading">로딩 중...</div>
  }

  if (isAuthenticated) {
    return <>{children}</>
  }

  return (
    <div className="auth-wrapper-bg">
      <div className="auth-card-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="logo-circle">
              <Grid size={24} color="#A0522D" strokeWidth={2.5} />
            </div>
            <h1>서비스 관리 시스템</h1>
            <p>접근 권한이 필요합니다</p>
          </div>

          <form onSubmit={handleLogin} className="auth-form">
            
            <div className="input-block">
              <label>아이디</label>
              <div className="input-group">
                <span className="input-icon"><User size={18} color="#8B7355" /></span>
                <input 
                  type="text" 
                  placeholder="ID를 입력해 주세요" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="input-block">
              <label>비밀번호</label>
              <div className="input-group">
                <span className="input-icon"><Lock size={18} color="#8B7355" /></span>
                <input 
                  type={showPassword ? "text" : "password"}
                  placeholder="비밀번호를 입력해 주세요" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button 
                  type="button" 
                  className="eye-btn" 
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} color="#888" /> : <Eye size={18} color="#888" />}
                </button>
              </div>
            </div>

            <div className="auth-options">
              <label className="checkbox-label" onClick={() => setSaveId(!saveId)}>
                {saveId ? <CheckCircle2 size={16} color="#8B7355" /> : <Circle size={16} color="#8B7355" />}
                <span>아이디 저장</span>
              </label>
              <label className="checkbox-label" onClick={() => setSavePassword(!savePassword)}>
                {savePassword ? <CheckCircle2 size={16} color="#8B7355" /> : <Circle size={16} color="#8B7355" />}
                <span>비밀번호 저장</span>
              </label>
              <label className="checkbox-label" onClick={() => setAutoLogin(!autoLogin)}>
                {autoLogin ? <CheckCircle2 size={16} color="#8B7355" /> : <Circle size={16} color="#8B7355" />}
                <span>자동 로그인</span>
              </label>
            </div>

            {errorMsg && <div className="auth-error">{errorMsg}</div>}

            <button type="submit" className="login-btn" disabled={isLoading}>
              {isLoading ? '확인 중...' : '로그인'}
            </button>

          </form>
        </div>
        
        <div className="secure-badge">
          <ShieldCheck size={14} color="#8B5A2B" />
          <span>안전한 데이터 보호 서비스 이용 중</span>
        </div>
      </div>

      <style jsx>{`
        .auth-loading { display: flex; align-items: center; justify-content: center; height: 100vh; background: #FCF6F5; font-weight: 700; color: #8B7355; }
        
        .auth-wrapper-bg {
          min-height: 100vh;
          background: linear-gradient(135deg, #FCF6F5 0%, #FAEDEB 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }

        .auth-card-container {
          width: 100%;
          max-width: 420px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }

        .auth-card {
          width: 100%;
          background: #ffffff;
          border-radius: 30px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.04);
          padding: 50px 35px 30px 35px;
        }
        
        .auth-header { text-align: center; margin-bottom: 35px; }
        .logo-circle { 
          width: 60px; height: 60px; 
          background: #FFE4E1; 
          border-radius: 50%; 
          display: flex; align-items: center; justify-content: center; 
          margin: 0 auto 16px auto; 
        }
        .auth-header h1 { font-size: 1.6rem; font-weight: 800; color: #1e293b; margin: 0 0 8px 0; letter-spacing: -0.5px; }
        .auth-header p { color: #6b7280; font-size: 0.95rem; margin: 0; font-weight: 500; }

        .auth-form { display: flex; flex-direction: column; gap: 20px; }
        
        .input-block { display: flex; flex-direction: column; gap: 8px; }
        .input-block label { font-size: 0.85rem; font-weight: 700; color: #4b5563; padding-left: 4px; }
        
        .input-group { position: relative; display: block; width: 100%; }
        .input-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: #8B7355; z-index: 10; pointer-events: none; }
        
        .input-group input { 
          box-sizing: border-box;
          margin: 0;
          display: block;
          width: 100%; 
          padding: 16px 45px 16px 45px; 
          border-radius: 30px; 
          border: 1px solid #E5D6D0; 
          background: #FAF3F0; 
          font-size: 1rem; 
          font-weight: 600; 
          color: #374151; 
          outline: none; 
          transition: all 0.2s; 
        }
        .input-group input:focus { border-color: #FF7F50; background: #fff; box-shadow: 0 0 0 3px rgba(255, 127, 80, 0.1); }
        .input-group input::placeholder { color: #A89B93; font-weight: 500; }
        
        /* 브라우저 자동완성(Autofill) 스타일 오버라이딩 */
        .input-group input:-webkit-autofill,
        .input-group input:-webkit-autofill:hover, 
        .input-group input:-webkit-autofill:focus, 
        .input-group input:-webkit-autofill:active {
            -webkit-box-shadow: 0 0 0 30px #FAF3F0 inset !important;
            -webkit-text-fill-color: #374151 !important;
            transition: background-color 5000s ease-in-out 0s;
        }

        .eye-btn {
          position: absolute; right: 16px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; padding: 0;
          display: flex; align-items: center; justify-content: center;
          z-index: 10;
        }

        .auth-options { display: flex; justify-content: space-between; margin-top: 4px; }
        .checkbox-label { display: flex; align-items: center; gap: 6px; cursor: pointer; user-select: none; }
        .checkbox-label span { font-size: 0.75rem; font-weight: 600; color: #555; }

        .auth-error { color: #ef4444; font-size: 0.85rem; font-weight: 700; text-align: center; }

        .login-btn { 
          width: 100%; padding: 18px; 
          background: linear-gradient(135deg, #FF7A59 0%, #FF6347 100%); 
          color: #fff; border: none; border-radius: 30px; 
          font-size: 1.15rem; font-weight: 800; letter-spacing: 1px;
          cursor: pointer; margin-top: 10px; transition: all 0.2s; 
          box-shadow: 0 8px 20px rgba(255, 122, 89, 0.3); 
        }
        .login-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 25px rgba(255, 122, 89, 0.4); }
        .login-btn:active { transform: translateY(0); }
        .login-btn:disabled { background: #d1d5db; box-shadow: none; cursor: not-allowed; transform: none; }

        .secure-badge {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          padding: 12px 24px;
          background: #F3EAE6;
          border: 1px solid #E5D6D0;
          border-radius: 30px;
          font-size: 0.8rem; font-weight: 700; color: #8B5A2B;
        }
      `}</style>
    </div>
  )
}
