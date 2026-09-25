import { useState, useEffect, useRef } from 'react'
import api from '../../api/client'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'  // ← ADD THIS

// ── Design tokens ─────────────────────────────────────────────────────────
const T = {
  navy: '#0f1b2d',
  navyMid: '#1a2e4a',
  navyLight: '#243b55',
  amber: '#f4a940',
  amberLight: '#fcd17a',
  teal: '#2ec4b6',
  rose: '#e84855',
  sage: '#4caf81',
  slate: '#8099b3',
  slateLight: '#b8ccdf',
  white: '#f8fafc',
  border: 'rgba(15,27,45,0.08)',
  shadow: '0 4px 24px rgba(15,27,45,0.10)',
  shadowMd: '0 8px 40px rgba(15,27,45,0.14)',
}

const getBatchDisplayName = (batch) => batch?.batch_code || batch?.display_name || batch?.batch_number || 'N/A'

const attendanceSessionText = (record) => {
  const count = Number(record.completed_session_count || 0)
  if (count > 0) return `${count} ${count === 1 ? 'Session' : 'Sessions'}`
  if (record.session_number) return `Session ${record.session_number}: ${record.session_title || ''}`
  return '-'
}

// ── Global Styles ─────────────────────────────────────────────────────────
export function StudentStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

      .student-root {
        font-family: 'DM Sans', sans-serif;
        color: ${T.navy};
      }
      .student-root h1, .student-root h2, .student-root h3, 
      .student-root h4, .student-root h5 {
        font-family: 'Playfair Display', serif;
      }

      .student-card {
        background: #fff;
        border-radius: 16px;
        box-shadow: ${T.shadow};
        border: 1px solid ${T.border};
        overflow: hidden;
        margin-bottom: 24px;
      }
      .student-card-header {
        padding: 16px 22px;
        border-bottom: 1px solid ${T.border};
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 10px;
      }
      .student-card-header h5 {
        margin: 0;
        font-family: 'Playfair Display';
        font-size: 17px;
        font-weight: 600;
      }

      .student-page-header {
        margin-bottom: 24px;
        padding-bottom: 18px;
        border-bottom: 2px solid ${T.border};
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 12px;
      }
      .student-page-header h3 {
        margin: 0 0 4px;
        font-size: 24px;
        background: linear-gradient(135deg, ${T.navy}, ${T.navyLight});
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .student-page-header p {
        margin: 0;
        color: ${T.slate};
        font-size: 13.5px;
      }

      .student-table {
        width: 100%;
        border-collapse: collapse;
      }
      .student-table th {
        background: linear-gradient(135deg, ${T.navy}, ${T.navyMid});
        color: white;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: .7px;
        text-transform: uppercase;
        padding: 13px 14px;
        text-align: left;
        white-space: nowrap;
      }
      .student-table td {
        padding: 12px 14px;
        border-bottom: 1px solid ${T.border};
        font-size: 13.5px;
        color: ${T.navy};
      }
      .student-table tr:last-child td {
        border-bottom: none;
      }
      .student-table tr:hover td {
        background: rgba(244,169,64,.04);
      }

      .student-btn {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 9px 18px;
        border-radius: 10px;
        border: none;
        font-family: 'DM Sans';
        font-weight: 600;
        font-size: 13px;
        cursor: pointer;
        transition: all .18s;
        white-space: nowrap;
        text-decoration: none;
      }
      .student-btn-primary {
        background: ${T.amber};
        color: ${T.navy};
      }
      .student-btn-primary:hover {
        background: ${T.amberLight};
        transform: translateY(-1px);
        box-shadow: 0 4px 14px rgba(244,169,64,.35);
      }
      .student-btn-ghost {
        background: transparent;
        color: ${T.slate};
        border: 1.5px solid ${T.border};
      }
      .student-btn-ghost:hover {
        background: ${T.white};
        color: ${T.navy};
        border-color: ${T.slateLight};
      }
      .student-btn-danger {
        background: ${T.rose};
        color: white;
      }
      .student-btn-success {
        background: ${T.sage};
        color: white;
      }
      .student-btn-sm {
        padding: 5px 12px;
        font-size: 12px;
        border-radius: 8px;
      }

      .student-input {
        padding: 9px 13px;
        border: 1.5px solid ${T.border};
        border-radius: 10px;
        font-family: 'DM Sans';
        font-size: 13px;
        outline: none;
        background: ${T.white};
        width: 100%;
        box-sizing: border-box;
        color: ${T.navy};
      }
      .student-input:focus {
        border-color: ${T.amber};
        box-shadow: 0 0 0 3px rgba(244,169,64,.15);
      }
      .student-select {
        padding: 9px 13px;
        border: 1.5px solid ${T.border};
        border-radius: 10px;
        font-family: 'DM Sans';
        font-size: 13px;
        outline: none;
        background: ${T.white};
        width: 100%;
        box-sizing: border-box;
        color: ${T.navy};
      }
      .student-label {
        display: block;
        font-weight: 600;
        font-size: 13px;
        margin-bottom: 5px;
        color: ${T.navy};
      }
      .student-fg {
        margin-bottom: 16px;
      }

      .student-stat-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin-bottom: 28px;
      }
      .student-stat-card {
        background: #fff;
        border-radius: 20px;
        padding: 20px;
        display: flex;
        align-items: center;
        gap: 16px;
        border: 1px solid ${T.border};
        box-shadow: ${T.shadow};
      }
      .student-stat-icon {
        width: 56px;
        height: 56px;
        border-radius: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
      }
      .student-stat-value {
        font-size: 28px;
        font-weight: 700;
        color: ${T.navy};
        line-height: 1.2;
      }
      .student-stat-label {
        font-size: 13px;
        color: ${T.slate};
        font-weight: 500;
      }

      .student-live-news-card {
        position: relative;
        overflow: hidden;
        border: 1px solid rgba(46,196,182,.16);
        background:
          radial-gradient(circle at 12% 0%, rgba(244,169,64,.12), transparent 24%),
          radial-gradient(circle at 88% 8%, rgba(46,196,182,.18), transparent 28%),
          linear-gradient(135deg, rgba(15,27,45,.98), rgba(24,43,68,.96));
        color: #fff;
      }
      .student-live-news-card::before {
        content: '';
        position: absolute;
        inset: -45% auto auto -18%;
        width: 42%;
        height: 210%;
        transform: rotate(18deg);
        background: linear-gradient(90deg, transparent, rgba(255,255,255,.12), transparent);
        animation: studentNewsSweep 5.8s ease-in-out infinite;
        pointer-events: none;
      }
      .student-live-news-card .student-card-header {
        position: relative;
        border-bottom-color: rgba(255,255,255,.12);
      }
      .student-live-news-card .student-card-header h5 {
        color: #fff;
      }
      .student-live-news-card .student-card-header h5::before {
        content: '';
        display: inline-block;
        width: 9px;
        height: 9px;
        margin-right: 9px;
        border-radius: 999px;
        background: ${T.teal};
        box-shadow: 0 0 0 0 rgba(46,196,182,.7);
        animation: studentNewsLivePulse 1.65s infinite;
      }
      .student-news-refresh {
        border: 1px solid rgba(255,255,255,.18);
        background: rgba(255,255,255,.1);
        color: #fff;
        border-radius: 999px;
        padding: 7px 12px;
        display: inline-flex;
        align-items: center;
        gap: 7px;
        font-size: 12px;
        font-weight: 800;
        cursor: pointer;
        backdrop-filter: blur(10px);
        transition: transform .18s ease, background .18s ease;
      }
      .student-news-refresh:hover {
        transform: translateY(-1px);
        background: rgba(255,255,255,.16);
      }
      .student-news-refresh:disabled {
        opacity: .65;
        cursor: wait;
      }
      .student-live-news-body {
        position: relative;
        padding: 14px 22px 18px;
      }
      .student-news-carousel {
        display: grid;
        grid-template-columns: 42px minmax(0, 1fr) 42px;
        align-items: center;
        gap: 13px;
      }
      .student-news-control {
        width: 42px;
        height: 42px;
        border: 1px solid rgba(255,255,255,.16);
        border-radius: 16px;
        background: rgba(255,255,255,.09);
        color: #fff;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: transform .18s ease, background .18s ease, border-color .18s ease;
      }
      .student-news-control:hover:not(:disabled) {
        transform: translateY(-2px) scale(1.03);
        background: rgba(255,255,255,.16);
        border-color: rgba(46,196,182,.45);
      }
      .student-news-control:disabled {
        opacity: .45;
        cursor: default;
      }
      .student-news-slide-window {
        position: relative;
        min-height: 126px;
        overflow: hidden;
        border-radius: 20px;
      }
      .student-news-slide {
        position: relative;
        min-height: 126px;
        padding: 16px 18px;
        border-radius: 20px;
        border: 1px solid rgba(255,255,255,.14);
        background:
          linear-gradient(90deg, rgba(255,255,255,.11), rgba(255,255,255,.07)),
          rgba(255,255,255,.08);
        box-shadow: 0 14px 30px rgba(0,0,0,.14);
        backdrop-filter: blur(14px);
        display: grid;
        grid-template-columns: 52px minmax(0, 1fr) auto;
        align-items: center;
        gap: 15px;
        animation:
          studentNewsSlideIn .48s ease both,
          studentNewsFlash 2.7s ease-in-out infinite;
      }
      .student-news-slide::before {
        content: '';
        position: absolute;
        top: 0;
        bottom: 0;
        left: -30%;
        width: 24%;
        border-radius: 999px;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,.13), transparent);
        transform: skewX(-18deg);
        animation: studentNewsSlideShine 3.8s ease-in-out infinite;
      }
      .student-news-image {
        width: 52px;
        height: 52px;
        border-radius: 16px;
        object-fit: cover;
        position: relative;
        z-index: 1;
      }
      .student-news-icon {
        width: 52px;
        height: 52px;
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(244,169,64,.18);
        color: ${T.amberLight};
        box-shadow: inset 0 0 0 1px rgba(255,255,255,.12);
        position: relative;
        z-index: 1;
      }
      .student-news-icon i {
        animation: studentNewsIconPulse 2.4s ease-in-out infinite;
      }
      .student-news-content {
        position: relative;
        min-width: 0;
        z-index: 1;
      }
      .student-news-meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        color: rgba(248,250,252,.72);
        font-size: 10px;
        font-weight: 800;
        margin-bottom: 6px;
        text-transform: uppercase;
      }
      .student-news-source {
        display: flex;
        align-items: center;
        gap: 7px;
        min-width: 0;
      }
      .student-news-source span:first-child {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .student-news-badge {
        flex: 0 0 auto;
        padding: 3px 7px;
        border-radius: 999px;
        background: rgba(232,72,85,.9);
        color: #fff;
        font-size: 9px;
        font-weight: 900;
        letter-spacing: .03em;
      }
      .student-news-content h6 {
        margin: 0;
        color: #fff;
        font-size: 15px;
        line-height: 1.28;
        font-family: 'DM Sans';
        font-weight: 800;
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .student-news-content p {
        margin: 6px 0 0;
        color: rgba(248,250,252,.76);
        font-size: 12px;
        line-height: 1.42;
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .student-news-link {
        position: relative;
        z-index: 1;
        display: inline-flex;
        align-items: center;
        gap: 7px;
        color: #fff;
        font-size: 12px;
        font-weight: 800;
        text-decoration: none;
        white-space: nowrap;
      }
      .student-news-link i {
        transition: transform .18s ease;
      }
      .student-news-link:hover i {
        transform: translate(2px, -2px);
      }
      .student-news-skeleton {
        display: grid;
        grid-template-columns: 1fr;
        gap: 14px;
      }
      .student-news-skeleton span {
        min-height: 126px;
        border-radius: 20px;
        background: linear-gradient(90deg, rgba(255,255,255,.06), rgba(255,255,255,.16), rgba(255,255,255,.06));
        background-size: 220% 100%;
        animation: studentNewsPulse 1.25s ease-in-out infinite;
      }
      .student-news-dots {
        display: flex;
        justify-content: center;
        gap: 7px;
        margin-top: 12px;
      }
      .student-news-dot {
        width: 7px;
        height: 7px;
        border: 0;
        padding: 0;
        border-radius: 999px;
        background: rgba(255,255,255,.34);
        cursor: pointer;
        transition: width .2s ease, background .2s ease;
      }
      .student-news-dot.active {
        width: 23px;
        background: ${T.teal};
      }
      @keyframes studentNewsSweep {
        0%, 42% { transform: translateX(-40%) rotate(18deg); opacity: 0; }
        52% { opacity: 1; }
        72%, 100% { transform: translateX(360%) rotate(18deg); opacity: 0; }
      }
      @keyframes studentNewsLivePulse {
        0% { box-shadow: 0 0 0 0 rgba(46,196,182,.7); }
        70% { box-shadow: 0 0 0 9px rgba(46,196,182,0); }
        100% { box-shadow: 0 0 0 0 rgba(46,196,182,0); }
      }
      @keyframes studentNewsSlideIn {
        0% { opacity: 0; transform: translateX(32px) scale(.985); }
        100% { opacity: 1; transform: translateX(0) scale(1); }
      }
      @keyframes studentNewsFlash {
        0%, 100% { border-color: rgba(255,255,255,.14); box-shadow: 0 14px 30px rgba(0,0,0,.14); }
        50% { border-color: rgba(46,196,182,.44); box-shadow: 0 18px 38px rgba(46,196,182,.14); }
      }
      @keyframes studentNewsSlideShine {
        0%, 35% { left: -30%; opacity: 0; }
        50% { opacity: 1; }
        80%, 100% { left: 108%; opacity: 0; }
      }
      @keyframes studentNewsIconPulse {
        0%, 100% { transform: scale(1); opacity: .9; }
        50% { transform: scale(1.12); opacity: 1; }
      }
      @keyframes studentNewsPulse {
        0% { background-position: 0% 50%; }
        100% { background-position: 220% 50%; }
      }
      @media (max-width: 640px) {
        .student-live-news-body {
          padding: 14px;
        }
        .student-news-carousel {
          grid-template-columns: 36px minmax(0, 1fr) 36px;
          gap: 8px;
        }
        .student-news-control {
          width: 36px;
          height: 36px;
          border-radius: 13px;
        }
        .student-news-slide {
          grid-template-columns: minmax(0, 1fr);
          min-height: 118px;
          padding: 14px;
        }
        .student-news-image,
        .student-news-icon {
          display: none;
        }
        .student-news-link {
          margin-top: 8px;
        }
      }

      .student-challenge-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 18px;
      }
      .student-challenge-card,
      .student-challenge-play {
        border-radius: 18px;
        border: 1px solid ${T.border};
        background: #fff;
        box-shadow: ${T.shadow};
      }
      .student-challenge-card {
        padding: 20px;
        overflow: hidden;
        position: relative;
      }
      .student-challenge-card::before {
        content: '';
        position: absolute;
        inset: 0 0 auto 0;
        height: 4px;
        background: linear-gradient(90deg, ${T.teal}, ${T.amber}, ${T.rose});
      }
      .student-challenge-card-top {
        display: flex;
        gap: 14px;
        align-items: flex-start;
      }
      .student-challenge-icon,
      .student-challenge-state-icon {
        width: 46px;
        height: 46px;
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        background: linear-gradient(135deg, ${T.navy}, ${T.teal});
        box-shadow: 0 12px 28px rgba(46,196,182,.18);
      }
      .student-challenge-kicker {
        color: ${T.teal};
        font-size: 11px;
        font-weight: 900;
        letter-spacing: .08em;
        text-transform: uppercase;
      }
      .student-challenge-card h4,
      .student-challenge-hero h3,
      .student-challenge-question-card h3 {
        margin: 4px 0;
        color: ${T.navy};
        font-weight: 900;
      }
      .student-challenge-card p,
      .student-challenge-hero p,
      .student-challenge-state p {
        margin: 0;
        color: ${T.slate};
      }
      .student-challenge-progress {
        height: 9px;
        border-radius: 999px;
        background: rgba(15,27,45,.08);
        overflow: hidden;
        margin: 18px 0 14px;
      }
      .student-challenge-progress span {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, ${T.teal}, ${T.amber});
      }
      .student-challenge-mini {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-bottom: 18px;
      }
      .student-challenge-mini span,
      .student-challenge-hero-stats span {
        padding: 7px 10px;
        border-radius: 999px;
        background: rgba(15,27,45,.06);
        color: ${T.slate};
        font-size: 12px;
        font-weight: 700;
      }
      .student-challenge-play {
        overflow: hidden;
      }
      .student-challenge-hero {
        padding: 22px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        background:
          radial-gradient(circle at 8% 0%, rgba(244,169,64,.14), transparent 28%),
          linear-gradient(135deg, rgba(15,27,45,.98), rgba(26,46,74,.94));
      }
      .student-challenge-hero h3,
      .student-challenge-hero p {
        color: #fff;
      }
      .student-challenge-hero-stats {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }
      .student-challenge-hero-stats span {
        color: #fff;
        background: rgba(255,255,255,.12);
      }
      .student-challenge-state {
        padding: 34px 22px;
        text-align: center;
      }
      .student-challenge-state-icon {
        margin: 0 auto 14px;
      }
      .student-challenge-state h3 {
        color: ${T.navy};
        margin: 0 0 8px;
        font-weight: 900;
      }
      .student-challenge-question-card {
        margin: 22px;
        padding: 22px;
        border: 1px solid ${T.border};
        border-radius: 18px;
        background: #fff;
      }
      .student-challenge-question-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        color: ${T.teal};
        font-size: 12px;
        font-weight: 900;
        text-transform: uppercase;
      }
      .student-challenge-session {
        margin-top: 12px;
        color: ${T.slate};
        font-size: 13px;
        font-weight: 700;
      }
      .student-challenge-options {
        display: grid;
        gap: 11px;
        margin-top: 18px;
      }
      .student-challenge-option {
        border: 1px solid ${T.border};
        border-radius: 14px;
        background: #fff;
        color: ${T.navy};
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 13px 14px;
        text-align: left;
        font-weight: 700;
        cursor: pointer;
        transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease;
      }
      .student-challenge-option:hover,
      .student-challenge-option.selected {
        transform: translateY(-2px);
        border-color: rgba(46,196,182,.5);
        box-shadow: 0 12px 26px rgba(46,196,182,.12);
      }
      .student-challenge-option span {
        width: 30px;
        height: 30px;
        border-radius: 10px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        background: ${T.navy};
        flex: 0 0 30px;
      }
      .student-challenge-option.selected span {
        background: ${T.teal};
      }
      .student-challenge-actions {
        padding: 0 22px 22px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        color: ${T.slate};
        font-weight: 800;
      }
      @media (max-width: 720px) {
        .student-challenge-hero,
        .student-challenge-actions {
          flex-direction: column;
          align-items: stretch;
        }
      }

      .student-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.5);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow-y: auto;
      }
      .student-modal {
        background: #fff;
        border-radius: 20px;
        width: 100%;
        max-height: 90vh;
        margin: 20px;
        display: flex;
        flex-direction: column;
      }
      .student-modal-header {
        padding: 20px 28px;
        border-bottom: 1px solid ${T.border};
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .student-modal-header h5 {
        margin: 0;
        font-family: 'Playfair Display', serif;
        font-size: 20px;
        font-weight: 600;
        color: ${T.navy};
      }
      .student-modal-close {
        background: #f1f5f9;
        border: none;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 16px;
        color: ${T.slate};
      }
      .student-modal-body {
        padding: 28px;
        overflow-y: auto;
        flex: 1;
      }

      .student-badge {
        display: inline-flex;
        align-items: center;
        padding: 3px 10px;
        border-radius: 20px;
        font-size: 11.5px;
        font-weight: 600;
        white-space: nowrap;
      }

      .student-empty {
        padding: 60px;
        text-align: center;
        color: ${T.slate};
      }
      .student-empty-icon {
        font-size: 48px;
        opacity: 0.2;
        margin-bottom: 16px;
      }

      .student-alert-info {
        background: #e4f2fd;
        border-radius: 10px;
        padding: 10px 14px;
        font-size: 13px;
        color: #1260a0;
      }
      .student-alert-warning {
        background: #fef5e4;
        border-radius: 10px;
        padding: 10px 14px;
        font-size: 13px;
        color: #8a5a00;
      }

      .student-divider {
        border: none;
        border-top: 1px solid ${T.border};
        margin: 20px 0;
      }
      .student-row-grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
      @media (max-width: 640px) {
        .student-row-grid-2 {
          grid-template-columns: 1fr;
        }
      }

      .student-session-card {
        background: #fff;
        border-radius: 16px;
        padding: 18px;
        border: 1px solid ${T.border};
        margin-bottom: 12px;
      }

      @keyframes studentSpin {
        to { transform: rotate(360deg); }
      }
      .student-spin {
        width: 40px;
        height: 40px;
        border: 3px solid ${T.border};
        border-top-color: ${T.amber};
        border-radius: 50%;
        animation: studentSpin 1s linear infinite;
        margin: 40px auto;
      }
    `}</style>
  )
}

// ── Shared Components ──────────────────────────────────────────────────────
export function StudentSpin() {
  return (
    <div style={{ padding: 56, textAlign: 'center' }}>
      <div className="student-spin" />
    </div>
  )
}

export function StudentEmpty({ msg = 'No data found.', icon = 'fa-inbox' }) {
  return (
    <div className="student-empty">
      <div className="student-empty-icon"><i className={`fas ${icon}`} /></div>
      <p style={{ margin: 0, fontFamily: "'Playfair Display'", fontSize: 16 }}>{msg}</p>
    </div>
  )
}

export function StudentBadge({ text, variant = 'default' }) {
  const variants = {
    success: { bg: '#e8f8f0', color: '#1a6b3e' },
    danger: { bg: '#fdeaec', color: '#9b1c27' },
    warning: { bg: '#fef5e4', color: '#8a5a00' },
    info: { bg: '#e4f2fd', color: '#1260a0' },
    pending: { bg: '#fff3cd', color: '#664d03' },
    default: { bg: '#f0f3f7', color: T.slate },
  }
  const s = variants[variant] || variants.default
  return <span className="student-badge" style={{ background: s.bg, color: s.color }}>{text}</span>
}

export function StudentModal({ open, onClose, title, children, size = 'lg' }) {
  if (!open) return null
  const maxW = { xl: 960, lg: 820, md: 600, sm: 460 }[size] || 820
  return (
    <div className="student-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="student-modal" style={{ maxWidth: maxW }}>
        <div className="student-modal-header">
          <h5>{title}</h5>
          <button className="student-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="student-modal-body">{children}</div>
      </div>
    </div>
  )
}

export function StudentPageHeader({ title, sub, btn }) {
  return (
    <div className="student-page-header">
      <div><h3>{title}</h3>{sub && <p>{sub}</p>}</div>
      {btn}
    </div>
  )
}

export function StudentSectionHeader({ title, count, actions }) {
  return (
    <div className="student-card-header">
      <h5>{title}{count != null && <span style={{ color: T.slate, fontWeight: 400, fontSize: 14, marginLeft: 8 }}>({count})</span>}</h5>
      {actions}
    </div>
  )
}

const STUDENT_FEEDBACK_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLScO29CvpRNB0057OxNROPr0IVPH6dAZZpueHFRRespT0g1E_A/viewform'
const STUDENT_FEEDBACK_EMBED_URL = `${STUDENT_FEEDBACK_FORM_URL}?embedded=true`
const STUDENT_FEEDBACK_INTERVAL_MS = 20 * 24 * 60 * 60 * 1000
const STUDENT_FEEDBACK_LAST_PROMPT_KEY = 'iie_student_feedback_last_prompt_at'

export function StudentDashboard() {
  const [data, setData] = useState(null)
  const [liveNews, setLiveNews] = useState([])
  const [activeNewsIndex, setActiveNewsIndex] = useState(0)
  const [newsLoading, setNewsLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [showFeedbackPrompt, setShowFeedbackPrompt] = useState(false)
  const feedbackTimerRef = useRef(null)
  const navigate = useNavigate()  // ← ADD THIS

  useEffect(() => {
    api.get('/dashboard/student/').then(r => setData(r.data)).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    let alive = true
    setNewsLoading(true)
    api.get('/news/?refresh=1')
      .then(r => {
        if (!alive) return
        const rows = Array.isArray(r.data?.results) ? r.data.results : Array.isArray(r.data) ? r.data : []
        setLiveNews(rows.slice(0, 4))
        setActiveNewsIndex(0)
      })
      .catch(() => {
        if (alive) setLiveNews([])
      })
      .finally(() => {
        if (alive) setNewsLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (liveNews.length <= 1) return undefined
    const timer = setInterval(() => {
      setActiveNewsIndex(index => (index + 1) % liveNews.length)
    }, 4200)
    return () => clearInterval(timer)
  }, [liveNews.length])

  const scheduleFeedbackPrompt = (delay = STUDENT_FEEDBACK_INTERVAL_MS) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
    feedbackTimerRef.current = setTimeout(() => setShowFeedbackPrompt(true), delay)
  }

  useEffect(() => {
    const lastPromptAt = Number(localStorage.getItem(STUDENT_FEEDBACK_LAST_PROMPT_KEY) || 0)
    const elapsed = Date.now() - lastPromptAt
    const delay = lastPromptAt ? Math.max(STUDENT_FEEDBACK_INTERVAL_MS - elapsed, 0) : STUDENT_FEEDBACK_INTERVAL_MS
    scheduleFeedbackPrompt(delay)
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
    }
  }, [])

  const closeFeedbackPrompt = () => {
    localStorage.setItem(STUDENT_FEEDBACK_LAST_PROMPT_KEY, String(Date.now()))
    setShowFeedbackPrompt(false)
    scheduleFeedbackPrompt()
  }

  const moveNews = direction => {
    if (!liveNews.length) return
    setActiveNewsIndex(index => (
      direction === 'next'
        ? (index + 1) % liveNews.length
        : (index - 1 + liveNews.length) % liveNews.length
    ))
  }

  if (loading) return <div className="student-root"><StudentStyles /><StudentSpin /></div>

  const assignedBatchIds = new Set()
  ;(data?.student?.assigned_batches || []).forEach(batch => {
    if (batch?.id != null) assignedBatchIds.add(batch.id)
  })
  ;(data?.student?.enrolled_courses || []).forEach(course => {
    ;(course?.batches || []).forEach(batch => {
      if (batch?.id != null) assignedBatchIds.add(batch.id)
    })
  })
  const assignedBatchesCount = assignedBatchIds.size || (data?.student?.assigned_batch ? 1 : 0)

  const stats = [
    { label: 'Announcements', value: data?.announcements_count ?? data?.announcements?.length ?? 0, icon: 'fa-bullhorn', color: T.teal, bgColor: 'rgba(46,196,182,0.1)', to: '/student/announcements' },
    { label: 'Attendance %', value: `${data?.attendance_percentage ?? 0}%`, icon: 'fa-calendar-check', color: T.sage, bgColor: 'rgba(76,175,129,0.1)', to: '/student/attendance' },
    { label: 'My Batches', value: assignedBatchesCount, icon: 'fa-layer-group', color: T.navy, bgColor: 'rgba(15,27,45,0.1)', to: '/student/batches' },
    { label: '15-Day Challenge', value: 'Play', icon: 'fa-bolt', color: T.amber, bgColor: 'rgba(244,169,64,0.12)', to: '/student/challenge' },
    { label: 'Completed Sessions', value: data?.completed_sessions_count ?? 0, icon: 'fa-check-double', color: T.sage, bgColor: 'rgba(76,175,129,0.1)', to: '/student/sessions' },
    { label: 'Tests', value: data?.tests_count ?? 0, icon: 'fa-file-alt', color: T.navy, bgColor: 'rgba(15,27,45,0.1)', to: '/student/tests' },
    { label: 'Quizzes', value: data?.quizzes_count ?? 0, icon: 'fa-question-circle', color: T.teal, bgColor: 'rgba(46,196,182,0.1)', to: '/student/quiz' },
    { label: 'Study Materials', value: data?.materials_count ?? 0, icon: 'fa-book', color: T.amber, bgColor: 'rgba(244,169,64,0.1)', to: '/student/materials' },
    { label: 'Fee Status', value: 'View', icon: 'fa-rupee-sign', color: T.rose, bgColor: 'rgba(232,72,85,0.1)', to: '/student/fee' },
  ]

  return (
    <div className="student-root">
      <StudentStyles />
      <StudentPageHeader
        title={`👋 Welcome, ${data?.student?.first_name || 'Student'}!`}
        sub={`Student ID: ${data?.student?.student_id || '—'} · Batch: ${data?.student?.assigned_batch_code || data?.student?.assigned_batch_number || 'Not assigned'}`}
      />
      <StudentModal open={showFeedbackPrompt} onClose={closeFeedbackPrompt} title="Student Feedback" size="xl">
        <iframe
          title="Student Feedback Form"
          src={STUDENT_FEEDBACK_EMBED_URL}
          style={{ width: '100%', height: '72vh', border: 0, borderRadius: 12, background: '#fff' }}
        />
      </StudentModal>
      <div className="student-card student-live-news-card">
        <StudentSectionHeader
          title="📰 Live Technology News"
          count={liveNews.length}
          actions={
            <button
              className="student-news-refresh"
              type="button"
              onClick={() => {
                setNewsLoading(true)
                api.get('/news/?refresh=1')
                  .then(r => {
                    const rows = Array.isArray(r.data?.results) ? r.data.results : Array.isArray(r.data) ? r.data : []
                    setLiveNews(rows.slice(0, 4))
                    setActiveNewsIndex(0)
                  })
                  .catch(() => toast.error('Failed to load live news'))
                  .finally(() => setNewsLoading(false))
              }}
              disabled={newsLoading}
            >
              <i className={`fas ${newsLoading ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`} />
              {newsLoading ? 'Loading' : 'Refresh'}
            </button>
          }
        />
        <div className="student-live-news-body">
          {newsLoading && liveNews.length === 0 ? (
            <div className="student-news-skeleton">
              {[0, 1, 2].map(i => <span key={i} />)}
            </div>
          ) : liveNews.length === 0 ? (
            <StudentEmpty msg="No live news available right now." icon="fa-newspaper" />
          ) : (
            <div>
              {(() => {
                const item = liveNews[activeNewsIndex] || liveNews[0]
                const publishedAt = item.published_at || item.publishedDate || item.created_at
                const link = item.original_url || item.originalUrl
                const image = item.image_url || item.imageUrl || item.image
                return (
                  <div className="student-news-carousel">
                    <button
                      type="button"
                      className="student-news-control"
                      onClick={() => moveNews('prev')}
                      disabled={liveNews.length <= 1}
                    >
                      <i className="fas fa-chevron-left" />
                    </button>
                    <div className="student-news-slide-window">
                      <article key={item.id || `${item.title}-${activeNewsIndex}`} className="student-news-slide">
                        {image ? (
                          <img className="student-news-image" src={image} alt="" />
                        ) : (
                          <div className="student-news-icon">
                            <i className="fas fa-bolt" />
                          </div>
                        )}
                        <div className="student-news-content">
                          <div className="student-news-meta">
                            <div className="student-news-source">
                              <span>{item.source || 'Google News'}</span>
                              <span className="student-news-badge">Latest</span>
                            </div>
                            <span>{publishedAt ? new Date(publishedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Live'}</span>
                          </div>
                          <h6>{item.title}</h6>
                          <p>{item.message || 'Latest technology update from live news feed.'}</p>
                        </div>
                        {link && (
                          <a href={link} target="_blank" rel="noreferrer" className="student-news-link">
                            Read more <i className="fas fa-arrow-up-right-from-square" />
                          </a>
                        )}
                      </article>
                    </div>
                    <button
                      type="button"
                      className="student-news-control"
                      onClick={() => moveNews('next')}
                      disabled={liveNews.length <= 1}
                    >
                      <i className="fas fa-chevron-right" />
                    </button>
                  </div>
                )
              })()}
              <div className="student-news-dots">
                {liveNews.map((item, idx) => (
                  <button
                    key={item.id || idx}
                    type="button"
                    className={`student-news-dot ${activeNewsIndex === idx ? 'active' : ''}`}
                    onClick={() => setActiveNewsIndex(idx)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="student-stat-grid">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="student-stat-card"
            onClick={() => stat.to && navigate(stat.to)}
            style={{
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              border: '1px solid transparent',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = `0 8px 24px ${stat.color}33`
              e.currentTarget.style.borderColor = stat.color
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = ''
              e.currentTarget.style.borderColor = 'transparent'
            }}
          >
            <div className="student-stat-icon" style={{ background: stat.bgColor, color: stat.color }}>
              <i className={`fas ${stat.icon}`} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="student-stat-value">{stat.value}</div>
              <div className="student-stat-label">{stat.label}</div>
            </div>
            <i className="fas fa-arrow-right" style={{ color: stat.color, opacity: 0.4, fontSize: 12 }} />
          </div>
        ))}
      </div>
      {data?.announcements?.length > 0 && (
        <div className="student-card">
          <StudentSectionHeader title="📢 Recent Announcements" />
          <div style={{ padding: '0 22px 22px 22px' }}>
            {data.announcements.slice(0, 5).map((a, idx) => (
              <div key={a.id} style={{
                padding: '14px 0',
                borderBottom: idx < data.announcements.slice(0, 5).length - 1 ? `1px solid ${T.border}` : 'none'
              }}>
                <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 14, color: T.navy }}>
                  {a.title}
                  {a.is_important && <StudentBadge text="Important" variant="danger" style={{ marginLeft: 8 }} />}
                </div>
                <p style={{ color: T.slate, fontSize: 13, margin: 0 }}>{a.message}</p>
                <div style={{ fontSize: 11, color: T.slateLight, marginTop: 8, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span>
                    <i className="fas fa-user-circle" style={{ marginRight: 6 }} />
                    {a.source === 'trainer' ? 'Mentor' : a.source === 'counselor' ? 'Counsellor' : 'Admin'}
                  </span>
                  <span>
                    <i className="far fa-calendar-alt" style={{ marginRight: 6 }} />
                    {new Date(a.created_at).toLocaleDateString('en-IN')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function StudentLoginRatingHistory() {
  const [weeks, setWeeks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/student/login-rating/history/?limit=8')
      .then(r => setWeeks(r.data?.weeks || []))
      .catch(() => toast.error('Failed to load login star history'))
      .finally(() => setLoading(false))
  }, [])

  const formatWeek = week => {
    if (!week?.week_start || !week?.week_end) return 'Week'
    return `${new Date(week.week_start).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} - ${new Date(week.week_end).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`
  }

  return (
    <div className="student-root">
      <StudentStyles />
      <StudentPageHeader title="⭐ Login Star History" sub="Previous weekly login ratings" />
      {loading ? <StudentSpin /> : (
        <div className="student-card">
          <StudentSectionHeader title="Previous Weeks" count={weeks.length} />
          <div style={{ padding: 22, display: 'grid', gap: 14 }}>
            {weeks.length === 0 ? <StudentEmpty msg="No previous ratings yet." icon="fa-star" /> : weeks.map(week => (
              <div key={week.week_start} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: 16, border: `1px solid ${T.border}`, borderRadius: 14, background: '#fff' }}>
                <div>
                  <div style={{ fontWeight: 800, color: T.navy }}>{formatWeek(week)}</div>
                  <div style={{ fontSize: 12, color: T.slate, marginTop: 4 }}>2 logins per day earns 1 star</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {[0, 1, 2, 3, 4].map(i => <i key={i} className={i < (week.stars || 0) ? 'fas fa-star' : 'far fa-star'} style={{ color: i < (week.stars || 0) ? '#f59e0b' : '#d8c7a2' }} />)}
                  </div>
                  <strong style={{ color: T.navy }}>{week.stars || 0}/5</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function StudentChallenge() {
  const [challenges, setChallenges] = useState([])
  const [selected, setSelected] = useState(null)
  const [today, setToday] = useState(null)
  const [answers, setAnswers] = useState({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [dayLoading, setDayLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const loadChallenges = () => {
    setLoading(true)
    api.get('/student/challenge/')
      .then(r => setChallenges(r.data?.results || r.data || []))
      .catch(() => toast.error('Failed to load challenge details'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadChallenges() }, [])

  const openChallenge = challenge => {
    setSelected(challenge)
    setToday(null)
    setAnswers({})
    setCurrentIndex(0)
    setDayLoading(true)
    api.get('/student/challenge/today/', { params: { course_id: challenge.course, batch_id: challenge.batch } })
      .then(r => setToday(r.data))
      .catch(err => toast.error(err.response?.data?.error || 'Unable to open challenge'))
      .finally(() => setDayLoading(false))
  }

  const submitDay = async () => {
    const day = today?.day
    const questions = day?.questions || []
    if (!day || questions.length !== 5) return
    if (Object.keys(answers).length !== 5) {
      toast.error('Please answer all 5 questions')
      return
    }
    setSubmitting(true)
    try {
      const payload = questions.map(q => ({ question_id: q.question, selected_answer: answers[q.question] }))
      const res = await api.post(`/student/challenge/day/${day.id}/submit/`, { answers: payload })
      setToday(res.data)
      setSelected(res.data?.challenge || selected)
      toast.success('Challenge submitted!')
      loadChallenges()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Submit failed')
    } finally {
      setSubmitting(false)
    }
  }

  const activeDay = today?.day
  const questions = activeDay?.questions || []
  const currentQuestion = questions[currentIndex]
  const activeChallenge = today?.challenge || selected
  const isCompleted = today?.state === 'completed' || activeDay?.status === 'completed'

  const ChallengeCard = ({ challenge }) => {
    const progress = Math.min(100, Number(challenge.progress_percentage || 0))
    return (
      <div className="student-challenge-card">
        <div className="student-challenge-card-top">
          <div className="student-challenge-icon"><i className="fas fa-bolt" /></div>
          <div>
            <div className="student-challenge-kicker">15-Day Challenge</div>
            <h4>{challenge.course_name || 'Course Challenge'}</h4>
            <p>{challenge.batch_code || challenge.batch_number || 'Assigned batch'}</p>
          </div>
        </div>
        <div className="student-challenge-progress">
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="student-challenge-mini">
          <span><strong>{challenge.completed_days || 0}/15</strong> Days</span>
          <span><strong>{challenge.current_streak || 0}</strong> Streak</span>
          <span><strong>{challenge.completed_sessions || 0}/{challenge.total_sessions || 0}</strong> Sessions</span>
        </div>
        <button className="student-btn student-btn-primary" onClick={() => openChallenge(challenge)}>
          {challenge.status === 'completed' ? 'View Achievement' : challenge.start_date ? 'Continue Challenge' : 'Start Challenge'}
        </button>
      </div>
    )
  }

  const ChallengeState = ({ icon, title, text }) => (
    <div className="student-challenge-state">
      <div className="student-challenge-state-icon"><i className={`fas ${icon}`} /></div>
      <h3>{title}</h3>
      <p>{text}</p>
      {activeChallenge && (
        <div className="student-challenge-mini" style={{ justifyContent: 'center' }}>
          <span><strong>{activeChallenge.current_streak || 0}</strong> Streak</span>
          <span><strong>{activeChallenge.completed_days || 0}/15</strong> Completed</span>
        </div>
      )}
    </div>
  )

  if (loading) return <div className="student-root"><StudentStyles /><StudentSpin /></div>

  return (
    <div className="student-root">
      <StudentStyles />
      <StudentPageHeader
        title="⚡ 15-Day Challenge"
        sub="Daily gamified MCQ practice from your completed sessions"
        btn={selected && <button className="student-btn student-btn-ghost" onClick={() => { setSelected(null); setToday(null) }}>Back to Challenges</button>}
      />

      {!selected ? (
        <div className="student-challenge-grid">
          {challenges.length === 0 ? <StudentEmpty msg="No challenge courses available yet." icon="fa-bolt" /> : challenges.map(challenge => (
            <ChallengeCard key={`${challenge.course}-${challenge.batch}`} challenge={challenge} />
          ))}
        </div>
      ) : dayLoading ? <StudentSpin /> : (
        <div className="student-challenge-play">
          <div className="student-challenge-hero">
            <div>
              <div className="student-challenge-kicker">15-Day Challenge</div>
              <h3>{activeChallenge?.course_name || 'Daily Practice'}</h3>
              <p>{activeChallenge?.batch_code || activeChallenge?.batch_number || 'Assigned batch'}</p>
            </div>
            <div className="student-challenge-hero-stats">
              <span>{activeChallenge?.completed_days || 0}/15 Done</span>
              <span>{activeChallenge?.current_streak || 0} Streak</span>
            </div>
          </div>

          {today?.state === 'insufficient_questions' ? (
            <ChallengeState icon="fa-hourglass-half" title="Challenge Not Ready" text="Your completed sessions do not have enough challenge questions yet. Please try again later." />
          ) : today?.state === 'outside_window' ? (
            <ChallengeState icon="fa-calendar-times" title="Challenge Window Closed" text="This challenge is outside the active window." />
          ) : isCompleted ? (
            <ChallengeState icon="fa-trophy" title={activeChallenge?.status === 'completed' ? 'Challenge Completed!' : `Day ${activeDay?.day_number || activeChallenge?.completed_days || 0} Complete`} text={`Score ${activeDay?.score ?? activeChallenge?.total_score ?? 0}/${activeDay?.total_questions || 5}`} />
          ) : activeDay && currentQuestion ? (
            <>
              <div className="student-challenge-question-card">
                <div className="student-challenge-question-top">
                  <span>Day {activeDay.day_number}/15</span>
                  <span>Question {currentIndex + 1} of {questions.length}</span>
                </div>
                <div className="student-challenge-session">
                  Session {currentQuestion.source_session_number || '-'} · {currentQuestion.source_session_title || 'Completed topic'}
                </div>
                <h3>{currentQuestion.question_text}</h3>
                <div className="student-challenge-options">
                  {currentQuestion.options.map(option => {
                    const selectedAnswer = answers[currentQuestion.question] === option.key
                    return (
                      <button
                        key={option.key}
                        type="button"
                        className={`student-challenge-option ${selectedAnswer ? 'selected' : ''}`}
                        onClick={() => setAnswers(prev => ({ ...prev, [currentQuestion.question]: option.key }))}
                      >
                        <span>{option.key}</span>
                        {option.text}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="student-challenge-actions">
                <button className="student-btn student-btn-ghost" disabled={currentIndex === 0} onClick={() => setCurrentIndex(i => Math.max(i - 1, 0))}>Previous</button>
                <span>{Object.keys(answers).length}/5 answered</span>
                {currentIndex < questions.length - 1 ? (
                  <button className="student-btn student-btn-primary" onClick={() => setCurrentIndex(i => i + 1)}>Next</button>
                ) : (
                  <button className="student-btn student-btn-primary" disabled={submitting} onClick={submitDay}>{submitting ? 'Submitting...' : 'Submit'}</button>
                )}
              </div>
            </>
          ) : (
            <ChallengeState icon="fa-circle-question" title="No Challenge Today" text="There is no active challenge available for this course and batch." />
          )}
        </div>
      )}
    </div>
  )
}

// ── STUDENT ATTENDANCE ─────────────────────────────────────────────────────
export function StudentAnnouncements() {
  const [announcements, setAnnouncements] = useState([])
  const [activeSource, setActiveSource] = useState('counselor')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [viewModal, setViewModal] = useState(null)

  useEffect(() => {
    api.get('/student/announcements/?sources=admin,counselor,trainer')
      .then(r => {
        const data = r.data || {}
        const items = data.results || [
          ...(data.admin || []),
          ...(data.counselor || []),
          ...(data.trainer || []),
        ]
        setAnnouncements((Array.isArray(items) ? items : []).filter(item => ['admin', 'counselor', 'trainer'].includes(item.source)))
      })
      .catch(() => toast.error('Failed to load announcements'))
      .finally(() => setLoading(false))
  }, [])

  const sources = [
    { key: 'admin', label: 'Admin Announcement', icon: 'fa-user-shield' },
    { key: 'counselor', label: 'Counsellor Announcement', icon: 'fa-user-tie' },
    { key: 'trainer', label: 'Mentor Announcement', icon: 'fa-chalkboard-teacher' },
  ]
  const counts = sources.reduce((acc, source) => {
    acc[source.key] = announcements.filter(item => item.source === source.key).length
    return acc
  }, {})
  const filtered = announcements
    .filter(item => item.source === activeSource)
    .filter(item => `${item.title} ${item.message} ${item.announcement_type} ${item.source_label} ${item.audience_label}`.toLowerCase().includes(search.toLowerCase()))

  const TYPE_META = {
    important: { bg: '#fdeaec', color: T.rose, label: 'Important', icon: 'fa-exclamation-triangle' },
    holiday: { bg: '#fef5e4', color: T.amber, label: 'Holiday', icon: 'fa-umbrella-beach' },
    event: { bg: '#e8f8f0', color: T.sage, label: 'Event', icon: 'fa-calendar-star' },
    update: { bg: '#e4f2fd', color: T.teal, label: 'Update', icon: 'fa-sync-alt' },
    general: { bg: '#f0f3f7', color: T.slate, label: 'General', icon: 'fa-bullhorn' },
    exam: { bg: '#e4f2fd', color: T.navy, label: 'Exam', icon: 'fa-file-alt' },
    course: { bg: '#e8f8f0', color: T.sage, label: 'Course', icon: 'fa-book-open' },
  }
  const TypeBadge = ({ type }) => {
    const m = TYPE_META[type] || TYPE_META.general
    return <span style={{ background: m.bg, color: m.color, padding: '4px 11px', borderRadius: 20, fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}><i className={`fas ${m.icon}`} />{m.label}</span>
  }

  return (
    <div className="student-root">
      <StudentStyles />
      <StudentPageHeader title="Announcements" sub="Admin, counsellor, and mentor updates" />

      <div className="student-card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          {sources.map(source => {
            const active = activeSource === source.key
            return (
              <button
                key={source.key}
                className={`student-btn ${active ? 'student-btn-primary' : 'student-btn-ghost'}`}
                onClick={() => setActiveSource(source.key)}
                style={{ flex: '1 1 150px', justifyContent: 'center' }}
              >
                <i className={`fas ${source.icon}`} /> {source.label}
                <span style={{ background: active ? 'rgba(15,27,45,.18)' : '#f0f3f7', color: active ? T.navy : T.slate, padding: '2px 8px', borderRadius: 999, fontSize: 11 }}>{counts[source.key] || 0}</span>
              </button>
            )
          })}
        </div>
        <input className="student-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search announcements" />
      </div>

      <div className="student-card">
        <StudentSectionHeader title={`${sources.find(s => s.key === activeSource)?.label} Announcements`} count={filtered.length} />
        {loading ? <StudentSpin /> : filtered.length === 0 ? (
          <StudentEmpty msg="No announcements found." icon="fa-bullhorn" />
        ) : (
          <div style={{ padding: 18, display: 'grid', gap: 12 }}>
            {filtered.map(item => (
              <div key={item.id} style={{ border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: T.navy }}>{item.title}</div>
                    <div style={{ color: T.slate, fontSize: 12, marginTop: 4 }}>
                {item.source === 'trainer' ? 'Mentor' : item.source === 'admin' ? 'Admin' : 'Counsellor'}
                {item.audience_label ? ` - ${item.audience_label}` : ''}
                    </div>
                  </div>
                  <TypeBadge type={item.announcement_type} />
                </div>
                <p style={{ margin: '0 0 12px', color: T.navyMid, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{item.message}</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ color: T.slate, fontSize: 12 }}><i className="far fa-calendar-alt" style={{ marginRight: 6 }} />{item.created_at ? new Date(item.created_at).toLocaleString('en-IN') : ''}</span>
                  <button className="student-btn student-btn-sm student-btn-ghost" onClick={() => setViewModal(item)}><i className="fas fa-eye" /> View</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <StudentModal open={!!viewModal} onClose={() => setViewModal(null)} title="Announcement Details" size="md">
        {viewModal && (
          <div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
              <TypeBadge type={viewModal.announcement_type} />
              <span style={{ color: T.slate, fontSize: 12 }}>{viewModal.source === 'trainer' ? 'Mentor' : viewModal.source === 'admin' ? 'Admin' : 'Counsellor'}{viewModal.audience_label ? ` - ${viewModal.audience_label}` : ''}</span>
            </div>
            <h4 style={{ margin: '0 0 10px', color: T.navy }}>{viewModal.title}</h4>
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: 16, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{viewModal.message}</div>
          </div>
        )}
      </StudentModal>
    </div>
  )
}

export function StudentAttendance() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [staffFilter, setStaffFilter] = useState('all')
  const params = new URLSearchParams(window.location.search)
  const batchId = params.get('batch_id')
  const courseId = params.get('course_id')
  const batchNumber = params.get('batch_number')
  const courseName = params.get('course_name')

  useEffect(() => {
    setLoading(true)
    setStaffFilter('all')
    const query = new URLSearchParams({ student: 'me' })
    if (courseId) query.set('course_id', courseId)
    else if (batchId) query.set('batch', batchId)
    api.get(`/attendance/?${query.toString()}`)
      .then(r => setRecords(r.data.results || r.data))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false))
  }, [batchId, courseId])

  const staffOptions = Array.from(
    records.reduce((map, record) => {
      const key = String(record.staff || record.staff_id || record.marked_by || '')
      if (key && !map.has(key)) {
        map.set(key, {
          id: key,
          name: record.marked_by || 'Staff',
        })
      }
      return map
    }, new Map()).values()
  ).sort((a, b) => a.name.localeCompare(b.name))

  const filteredRecords = records.filter(record => {
    const recordStaffKey = String(record.staff || record.staff_id || record.marked_by || '')
    return staffFilter === 'all' || recordStaffKey === staffFilter
  })

  const present = filteredRecords.filter(r => r.status === 'Present').length
  const pct = filteredRecords.length ? Math.round(present / filteredRecords.length * 100) : 0

  const stats = [
    { label: 'Attendance Rate', value: `${pct}%`, icon: 'fa-chart-line', color: T.sage, bgColor: 'rgba(76,175,129,0.1)' },
    { label: 'Present Days', value: present, icon: 'fa-check-circle', color: T.navy, bgColor: 'rgba(15,27,45,0.1)' },
    { label: 'Absent Days', value: filteredRecords.length - present, icon: 'fa-times-circle', color: T.rose, bgColor: 'rgba(232,72,85,0.1)' },
  ]

  return (
    <div className="student-root">
      <StudentStyles />
      <StudentPageHeader
        title="My Attendance"
        sub={courseName || batchNumber ? `${courseName || 'Course'}${batchNumber ? ` - ${batchNumber}` : ''}` : 'Track your attendance records'}
      />
      <div className="student-stat-grid">
        {stats.map((stat, idx) => (
          <div key={idx} className="student-stat-card">
            <div className="student-stat-icon" style={{ background: stat.bgColor, color: stat.color }}>
              <i className={`fas ${stat.icon}`} />
            </div>
            <div>
              <div className="student-stat-value">{stat.value}</div>
              <div className="student-stat-label">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="student-card">
        <StudentSectionHeader title="Attendance Records" count={filteredRecords.length} />
        {loading ? <StudentSpin /> : records.length === 0 ? (
          <StudentEmpty msg="No attendance records found" icon="fa-calendar-alt" />
        ) : (
          <>
            {staffOptions.length > 1 && (
              <div style={{ padding: '14px 18px 0' }}>
                <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 6, padding: 5, border: `1px solid ${T.border}`, borderRadius: 12, background: T.white }}>
                  <button
                    type="button"
                    onClick={() => setStaffFilter('all')}
                    style={{
                      border: 'none',
                      borderRadius: 9,
                      padding: '8px 13px',
                      cursor: 'pointer',
                      background: staffFilter === 'all' ? T.amber : 'transparent',
                      color: staffFilter === 'all' ? T.navy : T.slate,
                      fontWeight: 700,
                    }}
                  >
                    All
                  </button>
                  {staffOptions.map(staff => {
                    const active = staffFilter === staff.id
                    return (
                      <button
                        key={staff.id}
                        type="button"
                        onClick={() => setStaffFilter(staff.id)}
                        style={{
                          border: 'none',
                          borderRadius: 9,
                          padding: '8px 13px',
                          cursor: 'pointer',
                          background: active ? T.amber : 'transparent',
                          color: active ? T.navy : T.slate,
                          fontWeight: 700,
                        }}
                      >
                        {staff.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            {filteredRecords.length === 0 ? (
              <StudentEmpty msg="No attendance records found for selected staff" icon="fa-filter" />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="student-table">
                  <thead><tr><th>Date</th><th>Batch</th><th>Trainer</th><th>Session / Module</th><th>Status</th></tr></thead>
                  <tbody>
                    {filteredRecords.map(r => (
                      <tr key={r.id}>
                        <td>{r.date}</td>
                        <td>{r.batch_code || r.display_name || r.batch_number}</td>
                        <td>{r.marked_by || '-'}</td>
                        <td>{attendanceSessionText(r)}</td>
                        <td><StudentBadge text={r.status} variant={r.status === 'Present' ? 'success' : 'danger'} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── STUDENT SESSIONS ──────────────────────────────────────────────────────
export function StudentBatches() {
  const navigate = useNavigate()
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get('/student/batches/')
      .then(r => setBatches(r.data.results || r.data || []))
      .catch(() => setBatches([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="student-root"><StudentStyles /><StudentSpin /></div>

  const attendanceUrl = (batch) => {
    const query = new URLSearchParams()
    if (batch.id) query.set('batch_id', batch.id)
    if (batch.course_id) query.set('course_id', batch.course_id)
    if (batch.batch_number) query.set('batch_number', batch.batch_number)
    if (batch.course_name_display || batch.course_name) query.set('course_name', batch.course_name_display || batch.course_name)
    return `/student/attendance?${query.toString()}`
  }

  return (
    <div className="student-root">
      <StudentStyles />
      <StudentPageHeader title="My Batches" sub="All courses and batches assigned to you" />
      {batches.length === 0 ? (
        <div className="student-card"><StudentEmpty msg="No batches assigned yet" icon="fa-layer-group" /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
          {batches.map(batch => (
            <div key={batch.id} className="student-card" style={{ marginBottom: 0 }}>
              <div style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div className="student-stat-icon" style={{ background: '#e8f8f0', color: T.sage }}>
                    <i className="fas fa-layer-group" />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 20 }}>{batch.course_name_display || batch.course_name || 'Course'}</h4>
                    <div style={{ color: T.slate, fontSize: 13 }}>{getBatchDisplayName(batch)}</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 8, fontSize: 14, marginBottom: 16 }}>
                  <div>
                    <strong>Trainer(s):</strong> {(batch.trainer_names || []).join(', ') || batch.faculty_name || 'N/A'}{' '}
                    <StudentBadge
                      text={batch.trainer_status || 'Current Trainer'}
                      variant={batch.is_previous_assignment ? 'warning' : 'success'}
                    />
                  </div>
                  <div><strong>Batch:</strong> {getBatchDisplayName(batch)}</div>
                  <div><strong>Timing:</strong> {batch.batch_timing || 'N/A'}</div>
                  <div><strong>Duration:</strong> {batch.start_date || 'N/A'} to {batch.end_date || 'N/A'}</div>
                  <div><strong>Logsheet:</strong> {batch.total_sessions || 0} sessions, {batch.completed_sessions || 0} completed ({batch.progress_percentage || 0}%)</div>
                  <div>
                    <strong>Status:</strong>{' '}
                    <StudentBadge
                      text={batch.assignment_status || batch.status || 'Active'}
                      variant={batch.is_previous_assignment ? 'warning' : 'success'}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="student-btn student-btn-primary"
                    onClick={() => navigate(`/student/sessions?batch_id=${batch.id}`)}
                  >
                    <i className="fas fa-book-open" /> View Sessions
                  </button>
                  <button
                    type="button"
                    className="student-btn student-btn-success"
                    onClick={() => navigate(attendanceUrl(batch))}
                  >
                    <i className="fas fa-calendar-check" /> View Attendance
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function StudentSessions() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [doubtModal, setDoubtModal] = useState(null)
  const [doubtText, setDoubtText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)
  const params = new URLSearchParams(window.location.search)
  const batchId = params.get('batch_id')
  const courseId = params.get('course_id')

  const load = () => {
    setLoading(true)
    const query = batchId ? `?batch_id=${batchId}` : courseId ? `?course_id=${courseId}` : ''
    api.get(`/sessions/student/${query}`)
      .then(r => setSessions(r.data.results || r.data || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [batchId, courseId])

  const handleMarkComplete = async (session) => {
    if (!window.confirm(`Mark Session ${session.session_number}: "${session.title}" as completed?`)) return
    setActionLoading(session.id)
    try {
      await api.post('/sessions/student-complete/', { session_id: session.id })
      toast.success('Session marked as completed!')
      setSessions(prev => prev.map(item =>
        item.id === session.id
          ? {
              ...item,
              student_status: 'completed',
              staff_completed: true,
              has_response: false,
              completed_date: item.completed_date || new Date().toISOString(),
              student_confirmed_at: new Date().toISOString(),
            }
          : item
      ))
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to mark completed')
    } finally { setActionLoading(null) }
  }

  const handleRaiseDoubt = async () => {
    if (!doubtText.trim()) return toast.error('Please describe your doubt')
    setSubmitting(true)
    try {
      await api.post('/sessions/student-doubt/', { session_id: doubtModal.id, doubt_text: doubtText })
      toast.success('Doubt raised! Your trainer has been notified.')
      setSessions(prev => prev.map(item =>
        item.id === doubtModal.id
          ? {
              ...item,
              student_status: 'doubt',
              has_response: false,
              doubt_response: null,
            }
          : item
      ))
      setDoubtModal(null)
      setDoubtText('')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to raise doubt')
    } finally { setSubmitting(false) }
  }

  const completedCount = sessions.filter(s => s.student_status === 'completed').length
  const pct = sessions.length ? Math.round((completedCount / sessions.length) * 100) : 0

  if (loading) return <div className="student-root"><StudentStyles /><StudentSpin /></div>

  return (
    <div className="student-root">
      <StudentStyles />
      <StudentPageHeader title="📋 My Sessions" sub="Track your course progress and confirm completed sessions" />
      {sessions.length > 0 && (
        <div className="student-card" style={{ marginBottom: 20 }}>
          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontWeight: 600 }}>Course Progress</span>
              <span style={{ fontWeight: 700, color: T.sage }}>{pct}% ({completedCount}/{sessions.length})</span>
            </div>
            <div style={{ height: 8, background: '#e9ecef', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${T.sage}, ${T.teal})`, borderRadius: 4 }} />
            </div>
          </div>
        </div>
      )}
      {sessions.length === 0 ? (
        <div className="student-card"><StudentEmpty msg="No sessions available yet" icon="fa-list" /></div>
      ) : (
        sessions.map((s) => {
          const isCompleted = s.student_status === 'completed'
          const isDoubt = s.student_status === 'doubt'
          const hasResponse = s.has_response === true
          const canTakeAction = s.staff_completed && !isCompleted && !isDoubt && !hasResponse
          let statusText = '', statusVariant = ''
          if (isCompleted) { statusText = 'Completed'; statusVariant = 'success' }
          else if (isDoubt) { statusText = 'Doubt Raised'; statusVariant = 'warning' }
          else if (hasResponse || canTakeAction) { statusText = 'Ready to Confirm'; statusVariant = 'info' }
          else { statusText = 'Waiting for Trainer'; statusVariant = 'default' }
          return (
            <div key={s.id} className="student-session-card" style={{ borderLeft: `4px solid ${isCompleted ? T.sage : isDoubt ? T.amber : canTakeAction ? T.teal : T.slateLight}` }}>
              <div style={{ display: 'flex', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: isCompleted ? T.sage : isDoubt ? T.amber : canTakeAction ? T.teal : '#e9ecef', color: isCompleted || canTakeAction ? '#fff' : isDoubt ? T.navy : T.slate, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>
                  {isCompleted ? <i className="fas fa-check" /> : s.session_number}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div><h6 style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>{s.title || `Session ${s.session_number}`}</h6></div>
                    <StudentBadge text={statusText} variant={statusVariant} />
                  </div>
                  {hasResponse && s.doubt_response && !isCompleted && (
                    <div className="student-alert-info" style={{ marginTop: 12 }}>
                      <strong>Trainer's Response:</strong> {s.doubt_response}
                      <div style={{ marginTop: 10 }}><button className="student-btn student-btn-sm student-btn-success" onClick={() => handleMarkComplete(s)} disabled={actionLoading === s.id}>{actionLoading === s.id ? 'Processing...' : '✅ Mark as Completed'}</button></div>
                    </div>
                  )}
                  {canTakeAction && !hasResponse && (
                    <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                      <button className="student-btn student-btn-sm student-btn-success" onClick={() => handleMarkComplete(s)} disabled={actionLoading === s.id}>{actionLoading === s.id ? 'Processing...' : '✅ Mark as Completed'}</button>
                      <button className="student-btn student-btn-sm student-btn-primary" onClick={() => { setDoubtModal(s); setDoubtText('') }}>❓ Have a Doubt</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })
      )}
      {doubtModal && (
        <StudentModal open onClose={() => { setDoubtModal(null); setDoubtText('') }} title="❓ Raise a Doubt" size="md">
          <div className="student-alert-info" style={{ marginBottom: 16 }}>Session {doubtModal.session_number}: {doubtModal.title}</div>
          <textarea className="student-input" rows={4} placeholder="Describe your doubt..." value={doubtText} onChange={e => setDoubtText(e.target.value)} />
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
            <button className="student-btn student-btn-ghost" onClick={() => { setDoubtModal(null); setDoubtText('') }}>Cancel</button>
            <button className="student-btn student-btn-primary" onClick={handleRaiseDoubt} disabled={submitting || !doubtText.trim()}>{submitting ? 'Submitting...' : 'Submit Doubt'}</button>
          </div>
        </StudentModal>
      )}
    </div>
  )
}

// ── STUDENT NOTIFICATIONS ─────────────────────────────────────────────────
export function StudentNotifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const getTargetPath = (item) => {
    const paths = {
      announcement: '/student/announcements',
      leave_alert: '/student/attendance',
      session_completed: '/student/sessions',
      doubt_raised: '/student/sessions',
      doubt_resolved: '/student/sessions',
      quiz_result: '/student/quiz',
      support: '/student/support',
      leave_application: '/student/leave',
    }
    return paths[item.type] || '/student'
  }

  const load = () => {
    setLoading(true)
    api.get('/notifications/').then(async r => {
      const data = r.data || []
      setNotifications(data.map(n => ({ ...n, is_read: true })))
      if (data.some(n => !n.is_read)) {
        api.post('/notifications/read-all/')
        window.dispatchEvent(new Event('iie:notifications-read'))
      }
    }).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const markRead = async (id) => {
    await api.post(`/notifications/${id}/read/`)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const unread = notifications.filter(n => !n.is_read).length

  return (
    <div className="student-root">
      <StudentStyles />
      <StudentPageHeader title="🔔 Notifications" sub="Updates from your trainer" btn={unread > 0 && <StudentBadge text={`${unread} new`} variant="danger" />} />
      <div className="student-card">
        {loading ? <StudentSpin /> : notifications.length === 0 ? <StudentEmpty msg="No notifications yet" icon="fa-bell-slash" /> : (
          <div style={{ padding: '0 22px 22px 22px' }}>
            {notifications.map(n => (
              <div key={n.id} onClick={() => navigate(getTargetPath(n))} style={{ padding: 16, marginBottom: 12, background: n.is_read ? '#fff' : '#f0f7ff', border: `1px solid ${n.is_read ? T.border : T.teal}`, borderRadius: 12, cursor: 'pointer' }}>
                <div style={{ display: 'flex', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${T.teal}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fas fa-bell" style={{ color: T.teal }} /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>{n.title}</strong><small style={{ color: T.slate }}>{n.created_at}</small></div>
                    <p style={{ margin: '4px 0 0', fontSize: 13 }}>{n.message}</p>
                    <small style={{ color: T.teal, marginTop: 8, display: 'block', fontWeight: 700 }}>Click to open</small>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── STUDENT LEAVE ─────────────────────────────────────────────────────────
export function StudentLeave() {
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const load = () => {
    setLoading(true)
    api.get('/student-leave/').then(r => setLeaves(r.data.results || r.data || [])).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const pendingCount = leaves.filter(l => l.status === 'pending').length
  const approvedCount = leaves.filter(l => l.status === 'approved').length
  const rejectedCount = leaves.filter(l => l.status === 'rejected').length

  return (
    <div className="student-root">
      <StudentStyles />
      <StudentPageHeader title="📋 Leave Applications" sub="Apply for leave and track your requests" btn={<button className="student-btn student-btn-primary" onClick={() => setShowForm(true)}><i className="fas fa-plus" /> Apply Leave</button>} />
      <div className="student-stat-grid">
        <div className="student-stat-card" style={{ background: '#fef5e4', border: 'none' }}><div className="student-stat-icon" style={{ background: 'rgba(244,169,64,0.1)', color: T.amber }}><i className="fas fa-clock" /></div><div><div className="student-stat-value">{pendingCount}</div><div className="student-stat-label">Pending</div></div></div>
        <div className="student-stat-card" style={{ background: '#e8f8f0', border: 'none' }}><div className="student-stat-icon" style={{ background: 'rgba(76,175,129,0.1)', color: T.sage }}><i className="fas fa-check-circle" /></div><div><div className="student-stat-value">{approvedCount}</div><div className="student-stat-label">Approved</div></div></div>
        <div className="student-stat-card" style={{ background: '#fdeaec', border: 'none' }}><div className="student-stat-icon" style={{ background: 'rgba(232,72,85,0.1)', color: T.rose }}><i className="fas fa-times-circle" /></div><div><div className="student-stat-value">{rejectedCount}</div><div className="student-stat-label">Rejected</div></div></div>
      </div>
      <div className="student-card">
        <StudentSectionHeader title="My Leave History" count={leaves.length} />
        {loading ? <StudentSpin /> : leaves.length === 0 ? <StudentEmpty msg="No leave applications yet" icon="fa-calendar-alt" /> : (
          <div style={{ overflowX: 'auto' }}>
            <table className="student-table">
              <thead><tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th><th>Staff Remarks</th></tr></thead>
              <tbody>
                {leaves.map(l => (
                  <tr key={l.id}>
                    <td>{l.leave_type}</td><td>{l.start_date}</td><td>{l.end_date}</td><td>{l.number_of_days || l.no_of_days}</td>
                    <td style={{ maxWidth: 200 }}>{l.reason}</td>
                    <td><StudentBadge text={l.status} variant={l.status === 'approved' ? 'success' : l.status === 'rejected' ? 'danger' : 'pending'} /></td>
                    <td style={{ fontSize: 12 }}>{l.staff_remarks || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showForm && <StudentLeaveForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load() }} />}
    </div>
  )
}

function StudentLeaveForm({ onClose, onSaved }) {
  const [form, setForm] = useState({ start_date: '', end_date: '', leave_type: 'casual', reason: '' })
  const [saving, setSaving] = useState(false)
  const [calculatedDays, setCalculatedDays] = useState(0)

  useEffect(() => {
    if (form.start_date && form.end_date) {
      const start = new Date(form.start_date), end = new Date(form.end_date)
      setCalculatedDays(Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1)
    }
  }, [form.start_date, form.end_date])

  const save = async e => {
    e.preventDefault()
    if (!form.start_date || !form.end_date || !form.reason.trim()) return toast.error('Please fill all required fields')
    setSaving(true)
    try {
      await api.post('/student-leave/', { ...form, number_of_days: calculatedDays })
      toast.success('Leave application submitted!')
      onSaved()
    } catch { toast.error('Failed to submit') }
    finally { setSaving(false) }
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <StudentModal open onClose={onClose} title="Apply for Leave" size="md">
      <form onSubmit={save}>
        <div className="student-fg"><label className="student-label">Leave Type *</label><select className="student-select" value={form.leave_type} onChange={e => setForm(p => ({ ...p, leave_type: e.target.value }))} required><option value="sick">Sick Leave</option><option value="casual">Casual Leave</option><option value="emergency">Emergency Leave</option><option value="personal">Personal Leave</option><option value="other">Other</option></select></div>
        <div className="student-row-grid-2"><div className="student-fg"><label className="student-label">From Date *</label><input className="student-input" type="date" value={form.start_date} min={today} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} required /></div><div className="student-fg"><label className="student-label">To Date *</label><input className="student-input" type="date" value={form.end_date} min={form.start_date || today} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} required /></div></div>
        <div className="student-fg"><label className="student-label">Number of Days</label><input className="student-input" type="number" value={calculatedDays} readOnly style={{ background: '#f8f9fa' }} /></div>
        <div className="student-fg"><label className="student-label">Reason *</label><textarea className="student-input" rows={3} value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} placeholder="Please provide a detailed reason..." required /></div>
        {/* Contact Info removed per UI change request */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}><button type="button" className="student-btn student-btn-ghost" onClick={onClose}>Cancel</button><button type="submit" className="student-btn student-btn-primary" disabled={saving}>{saving ? 'Submitting...' : 'Submit Leave'}</button></div>
      </form>
    </StudentModal>
  )
}

// ── StudentMaterials ────────────────────────────────────────────────────────
export function StudentMaterials() {
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { api.get('/materials/').then(r => setMaterials(r.data.results || r.data)).finally(() => setLoading(false)) }, [])

  const fileIcon = url => {
    if (!url) return 'fa-file-alt'
    if (url.includes('.pdf')) return 'fa-file-pdf'
    if (url.includes('.doc')) return 'fa-file-word'
    return 'fa-file-alt'
  }

  const downloadMaterial = async (material) => {
    try {
      const res = await api.get(`/materials/${material.id}/download/`, { responseType: 'blob' })
      const blob = new Blob([res.data])
      const fileURL = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = fileURL
      link.download = material.file?.split('/').pop() || material.title || 'material'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(fileURL)
    } catch (err) {
      let message = 'File missing on server. Re-upload required or persistent storage required.'
      const data = err.response?.data
      if (data instanceof Blob) {
        try {
          const parsed = JSON.parse(await data.text())
          message = parsed.error || message
        } catch {
          // Uploaded files need persistent storage to survive redeploys.
        }
      } else if (data?.error) {
        message = data.error
      }
      toast.error(message)
    }
  }

  return (
    <div className="student-root">
      <StudentStyles />
      <StudentPageHeader title="📚 Study Materials" sub="Materials shared with your batch" />
      <div className="student-card">
        <StudentSectionHeader title="Materials" count={materials.length} />
        {loading ? <StudentSpin /> : materials.length === 0 ? <StudentEmpty msg="No materials available yet" icon="fa-folder-open" /> : (
          <div style={{ overflowX: 'auto' }}>
            <table className="student-table">
              <thead><tr><th>Title</th><th>Batch</th><th>Date</th><th>File</th></tr></thead>
              <tbody>
                {materials.map(m => (
                  <tr key={m.id}>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div style={{ width: 36, height: 36, borderRadius: 8, background: `linear-gradient(135deg, ${T.amber}, ${T.rose})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className={`fas ${fileIcon(m.file)}`} /></div><span style={{ fontWeight: 600 }}>{m.title}</span></div></td>
                    <td><StudentBadge text={m.batch_code || m.display_name || m.batch_number} variant="info" /></td>
                    <td style={{ fontSize: 12 }}>{m.uploaded_at ? new Date(m.uploaded_at).toLocaleDateString('en-IN') : '—'}</td>
                    <td>{m.file ? <button type="button" onClick={() => downloadMaterial(m)} className="student-btn student-btn-sm student-btn-ghost"><i className="fas fa-download" /> Download</button> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── StudentSupport ──────────────────────────────────────────────────────────
export function StudentSupport() {
  const [requests, setRequests] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = () => { setLoading(true); api.get('/student-support/').then(r => setRequests(r.data.results || r.data)).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])

  return (
    <div className="student-root">
      <StudentStyles />
      <StudentPageHeader title="🎧 Support Request" sub="Get help from admin" btn={<button className="student-btn student-btn-primary" onClick={() => setShowForm(true)}><i className="fas fa-plus" /> New Request</button>} />
      <div className="student-card">
        <StudentSectionHeader title="My Support Requests" count={requests.length} />
        {loading ? <StudentSpin /> : requests.length === 0 ? <StudentEmpty msg="No support requests yet" icon="fa-headset" /> : (
          <div style={{ overflowX: 'auto' }}>
            <table className="student-table">
              <thead><tr><th>Message</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id}>
                    <td style={{ maxWidth: 400 }}>{r.message}</td>
                    <td><StudentBadge text={r.status?.replace('_', ' ')} variant={r.status === 'resolved' ? 'success' : r.status === 'in_progress' ? 'info' : 'pending'} /></td>
                    <td style={{ fontSize: 12 }}>{r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showForm && (
        <StudentModal open onClose={() => setShowForm(false)} title="New Support Request" size="md">
          <div className="student-fg"><label className="student-label">Message / Issue *</label><textarea className="student-input" rows={5} value={message} onChange={e => setMessage(e.target.value)} placeholder="Describe your issue in detail..." required /></div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button className="student-btn student-btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="student-btn student-btn-primary" disabled={saving || !message} onClick={async () => { setSaving(true); try { await api.post('/student-support/', { message }); toast.success('Request submitted!'); setShowForm(false); setMessage(''); load() } catch { toast.error('Failed') } finally { setSaving(false) } }}>{saving ? 'Submitting...' : 'Submit Request'}</button>
          </div>
        </StudentModal>
      )}
    </div>
  )
}


// ── STUDENT TESTS (For QuizTest model - Manual Tests) ─────────────────────────────────────────
export function StudentTests() {
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTest, setActiveTest] = useState(null)
  const [testResults, setTestResults] = useState([])

  const loadTests = async () => {
    setLoading(true)
    try {
      const [testsRes, resultsRes] = await Promise.all([
        api.get('/student-tests/'),
        api.get('/test-results/')
      ])

      const allTests = testsRes.data.results || testsRes.data || []
      const completedTests = resultsRes.data.results || resultsRes.data || []

      // ── DEBUG: paste this output here ────────────────────────
      console.log('TEST OBJECT:', JSON.stringify(allTests[0]))
      console.log('RESULT OBJECT:', JSON.stringify(completedTests[0]))
      // ─────────────────────────────────────────────────────────

      const completedTestIds = new Set()
      completedTests.forEach(r => {
        if (r.test_id != null) completedTestIds.add(Number(r.test_id))
        if (r.test != null) completedTestIds.add(Number(r.test))
      })

      const availableTests = allTests.filter(test => {
        const tid = Number(test.test_id || test.id)
        return !completedTestIds.has(tid)
      })

      setTests(availableTests)
      setTestResults(completedTests)

    } catch (err) {
      toast.error('Failed to load tests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadTests() }, [])

  const startTest = async (test) => {
    if (test.creation_method === 'upload' && test.question_paper_url) {
      window.open(test.question_paper_url, '_blank', 'noopener,noreferrer')
      return
    }
    try {
      const testId = test.test_id || test.id
      const response = await api.get(`/tests/${testId}/questions/`)
      setActiveTest({ ...test, questions: response.data.questions || [] })
    } catch (err) {
      console.error("Error loading questions:", err)
      toast.error("Failed to load test questions")
    }
  }

  if (activeTest) {
    return <TakeTestComponent test={activeTest} onDone={() => { setActiveTest(null); loadTests() }} />
  }

  if (loading) {
    return (
      <div className="student-root">
        <StudentStyles />
        <StudentSpin />
      </div>
    )
  }

  return (
    <div className="student-root">
      <StudentStyles />
      <StudentPageHeader
        title="📋 My Tests"
        sub="Tests assigned by your trainer"
      />

      {/* Available Tests */}
      {tests.length > 0 && (
        <div className="student-card" style={{ marginBottom: 20 }}>
          <StudentSectionHeader title="Available Tests" count={tests.length} />
          <div style={{ padding: '0 22px 22px 22px' }}>
            <div className="student-row-grid-2">
              {tests.map(test => (
                <div key={test.id} className="student-card" style={{ padding: 0 }}>
                  <div style={{ padding: 18 }}>
                    <h5 style={{ margin: 0 }}>{test.test_title}</h5>
                    {test.test_description && (
                      <p style={{ color: T.slate, fontSize: 12, marginBottom: 12 }}>
                        {test.test_description}
                      </p>
                    )}
                    <div style={{ marginBottom: 16 }}>
                      <StudentBadge text={test.status || 'Upcoming'} variant={test.status === 'Active' ? 'success' : test.status === 'Completed' ? 'default' : 'info'} />
                      <StudentBadge text={test.creation_method === 'upload' ? 'Question Paper' : `${test.total_questions || 0} Questions`} variant="info" style={{ marginLeft: 8 }} />
                    </div>
                    <div style={{ display: 'grid', gap: 6, fontSize: 12, color: T.slate, marginBottom: 14 }}>
                      <span><i className="fas fa-graduation-cap" style={{ marginRight: 6 }} />{test.course_name || 'Course'}</span>
                      <span><i className="fas fa-user-tie" style={{ marginRight: 6 }} />{test.trainer || 'Trainer'}</span>
                      <span><i className="far fa-calendar-alt" style={{ marginRight: 6 }} />{test.test_date || 'Date not set'} {test.start_time ? `- ${test.start_time}` : ''}</span>
                      <span><i className="far fa-clock" style={{ marginRight: 6 }} />{test.duration_minutes || 0} minutes</span>
                    </div>
                    <button
                      className="student-btn student-btn-primary"
                      style={{ width: '100%' }}
                      onClick={() => startTest(test)}
                      disabled={test.creation_method !== 'upload' && test.total_questions === 0}
                    >
                      {test.creation_method === 'upload'
                        ? 'Open Question Paper'
                        : test.total_questions === 0 ? 'No Questions' : 'View Questions'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Completed Tests History */}
      {/* Completed Tests History */}
      {testResults.length > 0 && (
        <div className="student-card" style={{ marginTop: 20 }}>
          <StudentSectionHeader title="📊 Completed Tests History" count={testResults.length} />
          <div style={{ overflowX: 'auto' }}>
            <table className="student-table">
              <thead>
                <tr>
                  <th>Test Name</th>
                  <th>Score</th>
                  <th>Percentage</th>
                  <th>Result</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {testResults.map((result, idx) => (
                  <tr key={result.id || idx}>
                    <td style={{ fontWeight: 600 }}>{result.test_title || 'Test'}</td>
                    <td>{result.score || 0}/{result.total_questions || 0}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: '#e9ecef', borderRadius: 3, minWidth: 60 }}>
                          <div style={{
                            height: '100%',
                            width: `${result.percentage || 0}%`,
                            background: (result.percentage || 0) >= 50 ? T.sage : T.rose,
                            borderRadius: 3
                          }} />
                        </div>
                        <strong>{(result.percentage || 0).toFixed(1)}%</strong>
                      </div>
                    </td>
                    <td>
                      <StudentBadge
                        text={(result.percentage || 0) >= 50 ? '✅ Passed' : '❌ Failed'}
                        variant={(result.percentage || 0) >= 50 ? 'success' : 'danger'}
                      />
                    </td>
                    <td style={{ fontSize: 12, color: T.slate }}>
                      {result.submitted_at
                        ? new Date(result.submitted_at).toLocaleDateString('en-IN')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No tests message */}
      {tests.length === 0 && testResults.length === 0 && (
        <div className="student-card">
          <StudentEmpty msg="No tests assigned yet" icon="fa-file-alt" />
        </div>
      )}

      {/* All completed message */}
      {tests.length === 0 && testResults.length > 0 && (
        <div className="student-card">
          <div className="student-empty">
            <div className="student-empty-icon">
              <i className="fas fa-trophy" style={{ color: T.amber, fontSize: 48 }} />
            </div>
            <p style={{ fontFamily: "'Playfair Display'", fontSize: 16, fontWeight: 600 }}>
              🎉 Congratulations! 🎉
            </p>
            <p style={{ color: T.slate, marginTop: 8 }}>
              You've completed all assigned tests!
            </p>
          </div>
        </div>
      )}
    </div>
  )
}


// ── TAKE TEST COMPONENT (For QuizTest model) ─────────────────────────────────────────
function TakeTestComponent({ test, onDone }) {
  const [answers, setAnswers] = useState({})
  const [current, setCurrent] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const questions = test.questions || []

  if (test.test_type === 'technical') {
    return (
      <div className="student-root">
        <StudentStyles />
        <StudentPageHeader
          title={test.test_title}
          sub={`${test.course_name || 'Course'} - ${test.test_date || 'Date not set'} ${test.start_time ? `- ${test.start_time}` : ''}`}
          btn={<button className="student-btn student-btn-ghost" onClick={onDone}>Back to Tests</button>}
        />
        <div className="student-card">
          <StudentSectionHeader title="Technical Questions" count={questions.length} />
          <div style={{ padding: 22, display: 'grid', gap: 14 }}>
            {test.instructions && (
              <div className="student-alert-info">
                <strong>Instructions:</strong> {test.instructions}
              </div>
            )}
            {questions.length === 0 ? (
              <StudentEmpty msg="No technical questions found" icon="fa-file-alt" />
            ) : questions.map((q, idx) => (
              <div key={q.id || idx} style={{ padding: 16, border: `1px solid ${T.border}`, borderRadius: 10, background: '#fff' }}>
                <div style={{ fontWeight: 800, color: T.navy, marginBottom: 8 }}>Question {idx + 1}</div>
                <p style={{ margin: 0, color: T.slate }}>{q.question_text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // In TakeTestComponent, update the submitTest function:

  const submitTest = async () => {
    const answeredCount = Object.keys(answers).length
    if (answeredCount < questions.length && !window.confirm(`You have answered ${answeredCount}/${questions.length} questions. Submit anyway?`)) {
      return
    }

    setSubmitting(true)
    try {
      const response = await api.post(`/tests/${test.test_id}/take/`, { answers })

      // Show success message
      toast.success('Test submitted successfully!')

      // Set result data from response
      if (response.data) {
        setResult(response.data)
      }

      // Wait 2 seconds then go back to test list (which will refresh and hide this test)
      setTimeout(() => {
        onDone()  // This calls loadTests() in parent
      }, 2000)

    } catch (err) {
      console.error("Submission error:", err)
      toast.error(err.response?.data?.error || 'Failed to submit test')
      setSubmitting(false)
    }
  }

  if (result) {
    const passed = result.percentage >= 50
    return (
      <div className="student-root">
        <StudentStyles />
        <div className="student-card" style={{ maxWidth: 500, margin: '40px auto', textAlign: 'center' }}>
          <div style={{ padding: 40 }}>
            <div style={{ fontSize: 64, marginBottom: 20 }}>{passed ? '🎉' : '😔'}</div>
            <h3 style={{ color: passed ? T.sage : T.rose }}>
              {passed ? 'Congratulations!' : 'Better Luck Next Time'}
            </h3>
            <div style={{ fontSize: 48, fontWeight: 700, color: passed ? T.sage : T.rose, margin: '16px 0' }}>
              {result.percentage}%
            </div>
            <p>Your Score: <strong>{result.score}/{result.total_questions}</strong></p>
            <button className="student-btn student-btn-primary" onClick={onDone}>
              Back to Tests
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="student-root">
        <StudentStyles />
        <StudentPageHeader title={test.test_title} />
        <div className="student-card" style={{ textAlign: 'center', padding: 60 }}>
          <i className="fas fa-exclamation-triangle fa-3x" style={{ color: T.amber, marginBottom: 16 }} />
          <h5>No questions available for this test</h5>
          <button className="student-btn student-btn-primary" onClick={onDone}>
            Back to Tests
          </button>
        </div>
      </div>
    )
  }

  const q = questions[current]
  const answeredCount = Object.keys(answers).length

  if (!q) {
    return (
      <div className="student-root">
        <StudentStyles />
        <StudentPageHeader title={quiz.title || 'Quiz'} btn={<button className="student-btn student-btn-ghost" onClick={finishQuizView}>Back to Quizzes</button>} />
        <div className="student-card">
          <StudentEmpty msg="No questions found for this quiz" icon="fa-question-circle" />
        </div>
      </div>
    )
  }

  return (
    <div className="student-root">
      <StudentStyles />
      <div className="student-page-header" style={{ justifyContent: 'space-between' }}>
        <div>
          <h3>{test.test_title}</h3>
          <p>Question {current + 1} of {questions.length}</p>
        </div>
        <button className="student-btn student-btn-ghost student-btn-sm" onClick={onDone}>
          Exit
        </button>
      </div>

      <div className="student-row-grid-2" style={{ alignItems: 'start' }}>
        {/* Question Card */}
        <div className="student-card">
          <div style={{ padding: 24 }}>
            <div className="student-alert-info" style={{ marginBottom: 20 }}>
              Progress: {answeredCount} / {questions.length} answered ({Math.round(answeredCount / questions.length * 100)}%)
            </div>

            <h5 style={{ marginBottom: 20 }}>
              {current + 1}. {q.question_text}
            </h5>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { key: 'option1', label: 'A', value: q.option1 },
                { key: 'option2', label: 'B', value: q.option2 },
                { key: 'option3', label: 'C', value: q.option3 },
                { key: 'option4', label: 'D', value: q.option4 }
              ].filter(opt => opt.value && opt.value.trim()).map((opt) => (
                <label
                  key={opt.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: `2px solid ${answers[q.id] === opt.key ? T.amber : T.border}`,
                    background: answers[q.id] === opt.key ? `${T.amber}10` : '#fff',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="radio"
                    name={`q_${q.id}`}
                    value={opt.key}
                    checked={answers[q.id] === opt.key}
                    onChange={() => setAnswers({ ...answers, [q.id]: opt.key })}
                    style={{ accentColor: T.amber }}
                  />
                  <span style={{ fontWeight: 600 }}>{opt.label}.</span>
                  <span>{opt.value}</span>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
              <button
                className="student-btn student-btn-ghost"
                onClick={() => setCurrent(c => c - 1)}
                disabled={current === 0}
              >
                ← Previous
              </button>
              {current < questions.length - 1 ? (
                <button className="student-btn student-btn-primary" onClick={() => setCurrent(c => c + 1)}>
                  Next →
                </button>
              ) : (
                <button
                  className="student-btn student-btn-success"
                  onClick={submitTest}
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Test'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Navigator Card */}
        <div className="student-card">
          <div className="student-card-header">
            <h5>Question Navigator</h5>
          </div>
          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {questions.map((_, idx) => {
                const isAnswered = answers[questions[idx].id]
                return (
                  <button
                    key={idx}
                    onClick={() => setCurrent(idx)}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: isAnswered ? T.sage : (current === idx ? T.amber : '#e9ecef'),
                      color: isAnswered || current === idx ? '#fff' : T.slate,
                      border: 'none',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {idx + 1}
                  </button>
                )
              })}
            </div>
            <div className="student-divider" />
            <div>
              <p><span style={{ color: T.sage }}>●</span> Answered ({answeredCount})</p>
              <p><span style={{ color: '#e9ecef' }}>●</span> Unanswered ({questions.length - answeredCount})</p>
              <p><span style={{ color: T.amber }}>●</span> Current Question</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}



// ── STUDENT QUIZ LIST (Excel Quizzes) ─────────────────────────────────────
export function StudentQuizList() {
  const [quizzes, setQuizzes] = useState([])
  const [completedQuizzes, setCompletedQuizzes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeQuiz, setActiveQuiz] = useState(null)
  const [review, setReview] = useState(null)
  const [reviewLoading, setReviewLoading] = useState(false)

  const loadReview = async (attemptId) => {
    if (!attemptId) {
      toast.error('Result details not available')
      return
    }

    setReviewLoading(true)
    try {
      const response = await api.get(`/quiz/result/${attemptId}/`)
      setReview(response.data)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load quiz review')
    } finally {
      setReviewLoading(false)
    }
  }

  const loadQuizzes = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.get('/quiz/student/')
      const payload = response.data?.results || response.data || []
      const allQuizzes = Array.isArray(payload) ? payload.filter(Boolean) : []
      const available = [], completed = []
      allQuizzes.forEach(quiz => {
        const userAttempts = Number(quiz.user_attempts || 0)
        const maxAttempts = Number(quiz.max_attempts || 0)
        if (maxAttempts > 0 && userAttempts >= maxAttempts) completed.push(quiz)
        else available.push(quiz)
      })
      setQuizzes(available)
      setCompletedQuizzes(completed)
    } catch (err) {
      const message = err.response?.data?.error || err.response?.data?.detail || err.message || 'Failed to load quizzes'
      setError(message)
      toast.error(message)
      setQuizzes([])
      setCompletedQuizzes([])
    }
    finally { setLoading(false) }
  }

  useEffect(() => { loadQuizzes() }, [])

  if (activeQuiz) return <TakeQuiz quiz={activeQuiz} onDone={() => { setActiveQuiz(null); loadQuizzes() }} />

  return (
    <div className="student-root">
      <StudentStyles />
      <StudentPageHeader title="📝 Excel Quizzes" sub="Attempt your assigned quizzes" />
      {loading ? <StudentSpin /> : error ? (
        <div className="student-card">
          <StudentEmpty msg={error} icon="fa-triangle-exclamation" />
          <div style={{ textAlign: 'center', paddingBottom: 24 }}>
            <button className="student-btn student-btn-primary" onClick={loadQuizzes}>Retry</button>
          </div>
        </div>
      ) : quizzes.length === 0 && completedQuizzes.length === 0 ? (
        <div className="student-card"><StudentEmpty msg="No quizzes assigned yet" icon="fa-question-circle" /></div>
      ) : (
        <>
          {quizzes.length > 0 && (
            <>
              <h4 className="student-card-header" style={{ marginBottom: 16 }}>📌 Available Quizzes</h4>
              <div className="student-row-grid-2">
                {quizzes.map(q => (
                  <div key={q.id} className="student-card" style={{ padding: 0 }}>
                    <div style={{ padding: 18 }}>
                      <h5 style={{ margin: 0 }}>{q.title}</h5>
                      {q.description && <p style={{ color: T.slate, fontSize: 12, marginBottom: 12 }}>{q.description}</p>}
                      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                        <StudentBadge text={`${q.total_questions} Questions`} variant="info" />
                        <StudentBadge text={`${q.duration_minutes} min`} variant="warning" />
                        <StudentBadge text={`Pass: ${q.passing_marks}%`} variant="default" />
                      </div>
                      {q.user_attempts > 0 && q.best_score && <div className="student-alert-info" style={{ marginBottom: 12, padding: '6px 12px' }}><i className="fas fa-star" /> Best Score: {q.best_score}%</div>}
                      <button className="student-btn student-btn-primary" style={{ width: '100%' }} onClick={() => setActiveQuiz(q)}>{q.user_attempts > 0 ? '🔄 Retake Quiz' : '▶️ Start Quiz'}</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {completedQuizzes.length > 0 && (
            <div className="student-card" style={{ marginTop: 20 }}>
              <StudentSectionHeader title="📊 Completed Quizzes History" count={completedQuizzes.length} />
              <div style={{ overflowX: 'auto' }}>
                <table className="student-table">
                  <thead><tr><th>Quiz Name</th><th>Questions</th><th>Best Score</th><th>Attempts</th><th>Max Attempts</th><th>Status</th><th>Review</th></tr></thead>
                  <tbody>
                    {completedQuizzes.map(quiz => (
                      <tr key={quiz.id}>
                        <td style={{ fontWeight: 600 }}>{quiz.title}</td>
                        <td>{quiz.total_questions}</td>
                        <td><StudentBadge text={`${quiz.best_score || 0}%`} variant={quiz.best_score >= quiz.passing_marks ? 'success' : 'danger'} /></td>
                        <td>{quiz.user_attempts}</td>
                        <td>{quiz.max_attempts || '∞'}</td>
                        <td><StudentBadge text="Completed" variant="success" /></td>
                        <td>
                          <button className="student-btn student-btn-sm student-btn-primary" onClick={() => loadReview(quiz.last_attempt_id)} disabled={reviewLoading}>
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {review && <QuizReviewPanel review={review} onClose={() => setReview(null)} />}
        </>
      )}
    </div>
  )
}

function QuizReviewPanel({ review, onClose }) {
  const questions = review.questions || []

  return (
    <div className="student-card" style={{ marginTop: 20 }}>
      <div className="student-card-header">
        <div>
          <h5>{review.quiz_title || 'Quiz Review'}</h5>
          <div style={{ color: T.slate, fontSize: 12, marginTop: 4 }}>
            Score {review.score || 0}/{review.total_marks || 0} | {Number(review.percentage || 0).toFixed(1)}%
          </div>
        </div>
        <button className="student-btn student-btn-sm student-btn-ghost" onClick={onClose}>Close</button>
      </div>
      <div style={{ padding: 20, display: 'grid', gap: 14 }}>
        {questions.map((q, index) => (
          <div key={q.question_id || index} style={{ border: `1px solid ${q.is_correct ? 'rgba(76,175,129,.28)' : 'rgba(232,72,85,.28)'}`, borderRadius: 12, padding: 16, background: q.is_correct ? 'rgba(76,175,129,.06)' : 'rgba(232,72,85,.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
              <strong>Q{q.question_number || index + 1}. {q.question_text}</strong>
              <StudentBadge text={q.is_correct ? 'Correct' : 'Wrong'} variant={q.is_correct ? 'success' : 'danger'} />
            </div>
            <div style={{ display: 'grid', gap: 8, fontSize: 13 }}>
              <div><strong>Your answer:</strong> {q.selected_answer} - {q.selected_option_text}</div>
              <div><strong>Correct answer:</strong> {q.correct_answer} - {q.correct_option_text}</div>
              <div><strong>Marks:</strong> {q.marks_obtained || 0}/{q.marks || 0}</div>
              {q.explanation && <div><strong>Explanation:</strong> {q.explanation}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TakeQuiz({ quiz, onDone }) {
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [current, setCurrent] = useState(0)
  const [timeLeft, setTimeLeft] = useState(quiz.duration_minutes * 60)
  const [quizStarted, setQuizStarted] = useState(false)
  const [agreedToRules, setAgreedToRules] = useState(false)
  const confirmDialogOpenRef = useRef(false)
  const autoEndingRef = useRef(false)

  const questions = quiz.questions || []

  const enterQuizFullscreen = async () => {
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen()
      }
    } catch {
      // Browser may block fullscreen; the fixed quiz shell still covers the app UI.
    }
  }

  const exitQuizFullscreen = async () => {
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen()
      }
    } catch {
      // Ignore browser fullscreen cleanup failures.
    }
  }

  const handleStartQuiz = async () => {
    setQuizStarted(true)
    await enterQuizFullscreen()
  }

  const finishQuizView = async () => {
    await exitQuizFullscreen()
    onDone()
  }

  useEffect(() => {
    if (!quizStarted || result) return
    if (timeLeft <= 0) { submitQuiz({ skipConfirm: true }); return }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000)
    return () => clearInterval(timer)
  }, [timeLeft, quizStarted, result])

  useEffect(() => {
    if (result) exitQuizFullscreen()
  }, [result])

  useEffect(() => () => { exitQuizFullscreen() }, [])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const submitQuiz = async ({ skipConfirm = false, autoEnd = false } = {}) => {
    if (submitting) return
    const answeredCount = Object.keys(answers).length
    if (!skipConfirm && answeredCount < questions.length) {
      confirmDialogOpenRef.current = true
      const shouldSubmit = window.confirm(`You have answered ${answeredCount}/${questions.length} questions. Submit anyway?`)
      confirmDialogOpenRef.current = false
      if (!shouldSubmit) return
    }
    setSubmitting(true)
    try {
      const response = await api.post(`/quiz/${quiz.id}/take/`, { answers })
      try {
        const resultResponse = await api.get(`/quiz/result/${response.data.attempt_id}/`)
        setResult(resultResponse.data)
      } catch {
        setResult({
          quiz_title: quiz.title,
          score: response.data.score || 0,
          total_marks: response.data.total_marks || 0,
          percentage: response.data.percentage || 0,
          is_passed: response.data.is_passed,
          correct_count: response.data.correct_count || 0,
          wrong_count: Math.max((response.data.total_questions || questions.length) - (response.data.correct_count || 0), 0),
          questions: [],
        })
      }
      toast.success(autoEnd ? 'Quiz ended because you switched away from the quiz window.' : 'Quiz submitted successfully!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Submission failed')
    }
    finally {
      autoEndingRef.current = false
      setSubmitting(false)
    }
  }

  const handleExitQuiz = () => {
    confirmDialogOpenRef.current = true
    const shouldExit = window.confirm('Exit and end this quiz now? Your current answers will be submitted.')
    confirmDialogOpenRef.current = false
    if (!shouldExit) return
    submitQuiz({ skipConfirm: true })
  }

  useEffect(() => {
    if (!quizStarted || result) return

    const askToEndForSwitch = () => {
      if (submitting || result || confirmDialogOpenRef.current || autoEndingRef.current) return
      autoEndingRef.current = true
      confirmDialogOpenRef.current = true
      const shouldEnd = window.confirm('You are switching the tab. Do you want to end this quiz?')
      confirmDialogOpenRef.current = false
      if (shouldEnd) {
        submitQuiz({ skipConfirm: true, autoEnd: true })
        return
      }
      autoEndingRef.current = false
      setTimeout(() => {
        window.focus()
        enterQuizFullscreen()
      }, 100)
    }

    const handleVisibilityChange = () => {
      if (document.hidden) askToEndForSwitch()
    }

    const handleKeyDown = (event) => {
      const key = event.key.toLowerCase()
      const switchingShortcut =
        (event.ctrlKey && ['tab', 'l', 'r', 'w', 't', 'n'].includes(key)) ||
        (event.altKey && ['tab', 'arrowleft', 'arrowright', 'f4'].includes(key)) ||
        key === 'f5'

      if (!switchingShortcut) return
      event.preventDefault()
      event.stopPropagation()
      askToEndForSwitch()
    }

    window.addEventListener('blur', askToEndForSwitch)
    window.addEventListener('keydown', handleKeyDown, true)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.removeEventListener('blur', askToEndForSwitch)
      window.removeEventListener('keydown', handleKeyDown, true)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [quizStarted, result, submitting, answers])

  if (!quizStarted && !result) {
    return (
      <div className="student-root">
        <StudentStyles />
        <StudentPageHeader title={quiz.title} btn={<button className="student-btn student-btn-ghost" onClick={finishQuizView}>Exit</button>} />
        <div className="student-card" style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ padding: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>📝</div>
            <h3>Ready to start?</h3>
            <div style={{ margin: '20px 0' }}><p><strong>Duration:</strong> {quiz.duration_minutes} minutes</p><p><strong>Questions:</strong> {questions.length}</p><p><strong>Passing marks:</strong> {quiz.passing_marks}%</p></div>
            <div className="student-alert-info" style={{ margin: '20px 0', textAlign: 'left' }}>
              <strong>Quiz Instructions</strong>
              <p style={{ margin: '8px 0 0' }}>Do not switch tabs, use Alt+Tab, minimize the browser, or leave the quiz window after starting. If you try to switch, you must choose whether to end this quiz or continue.</p>
            </div>
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', justifyContent: 'center', marginBottom: 18, cursor: 'pointer', fontWeight: 700 }}>
              <input type="checkbox" checked={agreedToRules} onChange={e => setAgreedToRules(e.target.checked)} style={{ marginTop: 3, accentColor: T.amber }} />
              <span>I agree to follow the quiz instructions.</span>
            </label>
            <button className="student-btn student-btn-primary" onClick={handleStartQuiz} disabled={!agreedToRules}>Agree and Continue</button>
          </div>
        </div>
      </div>
    )
  }

  if (result) {
    const passed = result.percentage >= quiz.passing_marks
    return (
      <div className="student-root">
        <StudentStyles />
        <StudentPageHeader title={`Quiz Result: ${quiz.title}`} btn={<button className="student-btn student-btn-ghost" onClick={finishQuizView}>Back to Quizzes</button>} />
        <div className="student-card" style={{ maxWidth: 500, margin: '0 auto 20px', textAlign: 'center' }}>
          <div style={{ padding: 32 }}>
            <div style={{ fontSize: 64, marginBottom: 20 }}>{passed ? '🎉' : '😔'}</div>
            <h3 style={{ color: passed ? T.sage : T.rose }}>{passed ? 'Congratulations!' : 'Better Luck Next Time'}</h3>
            <div style={{ fontSize: 48, fontWeight: 700, color: passed ? T.sage : T.rose, margin: '16px 0' }}>{result.percentage}%</div>
            <p>Your Score: <strong>{result.score}/{result.total_marks}</strong></p>
            <p>Correct: {result.correct_count} | Wrong: {result.wrong_count}</p>
            <button className="student-btn student-btn-primary" onClick={finishQuizView}>Back to Quizzes</button>
          </div>
        </div>
        <QuizReviewPanel review={result} onClose={finishQuizView} />
      </div>
    )
  }

  const q = questions[current]
  const answeredCount = Object.keys(answers).length

  return (
    <div className="student-root" style={{ position: 'fixed', inset: 0, zIndex: 9999, width: '100vw', height: '100vh', overflow: 'auto', background: '#f8fafc', padding: '24px clamp(16px, 3vw, 44px) 92px' }}>
      <StudentStyles />
      <div className="student-page-header" style={{ justifyContent: 'space-between' }}>
        <div><h3>{quiz.title}</h3><p>Question {current + 1} of {questions.length}</p></div>
        <div><div className="student-badge" style={{ background: T.rose, color: '#fff', fontSize: 14 }}><i className="fas fa-hourglass-half" /> Time Left: {formatTime(timeLeft)}</div></div>
      </div>
      <div className="student-row-grid-2" style={{ alignItems: 'start' }}>
        <div className="student-card">
          <div style={{ padding: 24 }}>
            <div className="student-alert-info" style={{ marginBottom: 20 }}>Progress: {answeredCount} / {questions.length} answered ({Math.round(answeredCount / questions.length * 100)}%)</div>
            <h5 style={{ marginBottom: 20 }}>{current + 1}. {q.question_text}</h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[['A', q.option_a], ['B', q.option_b], ['C', q.option_c], ['D', q.option_d]].filter(([, val]) => val && val.trim()).map(([key, opt]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, border: `2px solid ${answers[q.id] === key ? T.amber : T.border}`, background: answers[q.id] === key ? `${T.amber}10` : '#fff', cursor: 'pointer' }}>
                  <input type="radio" name={`q-${q.id}`} value={key} checked={answers[q.id] === key} onChange={() => setAnswers(prev => ({ ...prev, [q.id]: key }))} style={{ accentColor: T.amber }} />
                  <span style={{ fontWeight: 600 }}>{key}.</span> <span>{opt}</span>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
              <button className="student-btn student-btn-ghost" onClick={() => setCurrent(c => c - 1)} disabled={current === 0}>← Previous</button>
              {current < questions.length - 1 ? <button className="student-btn student-btn-primary" onClick={() => setCurrent(c => c + 1)}>Next →</button> : <button className="student-btn student-btn-success" onClick={submitQuiz} disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Quiz'}</button>}
            </div>
          </div>
        </div>
        <div className="student-card">
          <div className="student-card-header"><h5>Question Navigator</h5></div>
          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {questions.map((_, idx) => {
                const isAnswered = answers[questions[idx].id]
                return <button key={idx} onClick={() => setCurrent(idx)} style={{ width: 40, height: 40, borderRadius: 10, background: isAnswered ? T.sage : (current === idx ? T.amber : '#e9ecef'), color: isAnswered || current === idx ? '#fff' : T.slate, border: 'none', fontWeight: 600, cursor: 'pointer' }}>{idx + 1}</button>
              })}
            </div>
            <div className="student-divider" />
            <div className="student-hint"><p><span style={{ color: T.sage }}>●</span> Answered ({answeredCount})</p><p><span style={{ color: '#e9ecef' }}>●</span> Unanswered ({questions.length - answeredCount})</p><p><span style={{ color: T.amber }}>●</span> Current Question</p></div>
          </div>
        </div>
      </div>
      <button
        className="student-btn student-btn-danger"
        onClick={handleExitQuiz}
        disabled={submitting}
        style={{ position: 'fixed', right: 24, bottom: 22, zIndex: 10000, boxShadow: '0 14px 34px rgba(232,72,85,.32)' }}
      >
        {submitting ? 'Ending...' : 'Exit Quiz'}
      </button>
    </div>
  )
}

function PaymentRequestButton({ feeId, balance, fmt }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ amount: '', payment_mode: 'cash', notes: '' })
  const [screenshot, setScreenshot] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) return toast.error('Enter valid amount')
    if (parseFloat(form.amount) > parseFloat(balance)) return toast.error(`Amount cannot exceed balance of ${fmt(balance)}`)
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('fee_id', feeId)
      fd.append('amount', form.amount)
      fd.append('payment_mode', form.payment_mode)
      fd.append('notes', form.notes)
      if (screenshot) fd.append('screenshot', screenshot)

      await api.post('/student/fee/payment-request/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success('Payment request sent! Admin will verify and record it.')
      setShowForm(false)
      setForm({ amount: '', payment_mode: 'cash', notes: '' })
      setScreenshot(null)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send request')
    } finally { setSubmitting(false) }
  }

  return (
    <>
      <button
        className="student-btn student-btn-primary"
        onClick={() => setShowForm(true)}
        style={{ width: '100%' }}
      >
        <i className="fas fa-paper-plane" /> I Have Paid — Notify Admin
      </button>

      {showForm && (
        <StudentModal open onClose={() => setShowForm(false)} title="💸 Payment Notification" size="md">
          <div className="student-alert-info" style={{ marginBottom: 16 }}>
            <i className="fas fa-info-circle" style={{ marginRight: 8 }} />
            This will notify the admin that you have made a payment. Admin will verify and record it.
          </div>

          <div className="student-fg">
            <label className="student-label">Amount Paid (₹) *</label>
            <input
              className="student-input"
              type="number"
              placeholder={`Max: ${fmt(balance)}`}
              value={form.amount}
              onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
              max={balance}
              min={1}
            />
          </div>

          <div className="student-fg">
            <label className="student-label">Payment Mode *</label>
            <select className="student-select" value={form.payment_mode} onChange={e => setForm(p => ({ ...p, payment_mode: e.target.value }))}>
              <option value="cash">💵 Cash</option>
              <option value="upi">📱 UPI</option>
              <option value="bank_transfer">🏦 Bank Transfer</option>
              <option value="cheque">📝 Cheque</option>
            </select>
          </div>

          <div className="student-fg">
            <label className="student-label">Transaction ID / Notes (optional)</label>
            <input
              className="student-input"
              placeholder="e.g. UPI transaction ID, reference number..."
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
            />
          </div>

          {/* ── Screenshot field ────────────────────────────────── */}
          <div className="student-fg">
            <label className="student-label">Payment Screenshot (optional)</label>
            {screenshot ? (
              <div style={{ background: '#e8f8f0', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <i className="fas fa-image" style={{ color: T.sage, fontSize: 16 }} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#1a6b3e' }}>{screenshot.name}</span>
                <button
                  type="button"
                  className="student-btn student-btn-sm student-btn-ghost"
                  onClick={() => setScreenshot(null)}
                >
                  <i className="fas fa-times" />
                </button>
              </div>
            ) : (
              <input
                className="student-input"
                type="file"
                accept="image/*"
                onChange={e => setScreenshot(e.target.files[0] || null)}
              />
            )}
            <small style={{ color: T.slate, fontSize: 11 }}>Upload screenshot of your payment (JPG, PNG)</small>
          </div>
          {/* ─────────────────────────────────────────────────────── */}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="student-btn student-btn-ghost" onClick={() => { setShowForm(false); setScreenshot(null) }}>Cancel</button>
            <button className="student-btn student-btn-primary" onClick={submit} disabled={submitting}>
              <i className={`fas ${submitting ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`} />
              {submitting ? 'Sending...' : 'Send Notification'}
            </button>
          </div>
        </StudentModal>
      )}
    </>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// STUDENT FEE DETAILS
// ══════════════════════════════════════════════════════════════════════════════
export function StudentFeeDetails() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/student/fee/').then(r => setData(r.data)).finally(() => setLoading(false))
  }, [])

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

const downloadBill = async (feeId) => {
  const toastId = toast.loading('Downloading bill...')

  try {
    const response = await api.get(`/fees/${feeId}/bill/`, {
      responseType: 'blob'
    })

    const blob = new Blob([response.data], { type: 'application/pdf' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `Fee_Receipt.pdf`

    document.body.appendChild(link)
    link.click()
    link.remove()

    window.URL.revokeObjectURL(url)

    toast.success('Bill downloaded!', { id: toastId })
  } catch (err) {
    console.error('Download error:', err)
    toast.error('Failed to download bill', { id: toastId })
  }
}
  if (loading) return <div className="student-root"><StudentStyles /><StudentSpin /></div>

  const fee = data?.fee
  const transactions = data?.transactions || []

  return (
    <div className="student-root">
      <StudentStyles />
      <StudentPageHeader title="💰 Fee Details" sub="Your course fee and payment history" />

      {!fee ? (
        <div className="student-card">
          <StudentEmpty msg="No fee record found. Please contact your counselor." icon="fa-rupee-sign" />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="student-stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="student-stat-card" style={{ background: '#fef5e4', border: 'none' }}>
              <div className="student-stat-icon" style={{ background: 'rgba(244,169,64,0.1)', color: T.amber }}>
                <i className="fas fa-rupee-sign" />
              </div>
              <div>
                <div className="student-stat-value" style={{ fontSize: 20 }}>{fmt(fee.total_fee)}</div>
                <div className="student-stat-label">Total Fee</div>
              </div>
            </div>
            <div className="student-stat-card" style={{ background: '#e8f8f0', border: 'none' }}>
              <div className="student-stat-icon" style={{ background: 'rgba(76,175,129,0.1)', color: T.sage }}>
                <i className="fas fa-check-circle" />
              </div>
              <div>
                <div className="student-stat-value" style={{ fontSize: 20 }}>{fmt(fee.amount_paid)}</div>
                <div className="student-stat-label">Amount Paid</div>
              </div>
            </div>
            <div className="student-stat-card" style={{ background: fee.balance > 0 ? '#fdeaec' : '#e8f8f0', border: 'none' }}>
              <div className="student-stat-icon" style={{ background: fee.balance > 0 ? 'rgba(232,72,85,0.1)' : 'rgba(76,175,129,0.1)', color: fee.balance > 0 ? T.rose : T.sage }}>
                <i className={`fas ${fee.balance > 0 ? 'fa-clock' : 'fa-check-double'}`} />
              </div>
              <div>
                <div className="student-stat-value" style={{ fontSize: 20, color: fee.balance > 0 ? T.rose : T.sage }}>{fmt(fee.balance)}</div>
                <div className="student-stat-label">Balance Due</div>
              </div>
            </div>
          </div>

          {/* Fee Summary Card */}
          <div className="student-card" style={{ marginBottom: 20 }}>
            <div className="student-card-header">
              <h5>📋 Fee Summary</h5>
              <StudentBadge
                text={fee.is_fully_paid ? '✅ Fully Paid' : '⏳ Payment Pending'}
                variant={fee.is_fully_paid ? 'success' : 'danger'}
              />
            </div>
            <div style={{ padding: '20px 22px' }}>
              {/* Progress Bar */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, fontWeight: 600 }}>
                  <span>Payment Progress</span>
                  <span style={{ color: T.sage }}>
                    {fee.total_fee > 0 ? Math.round((fee.amount_paid / fee.total_fee) * 100) : 0}%
                  </span>
                </div>
                <div style={{ height: 10, background: '#e9ecef', borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${fee.total_fee > 0 ? (fee.amount_paid / fee.total_fee) * 100 : 0}%`,
                    background: `linear-gradient(90deg, ${T.sage}, ${T.teal})`,
                    borderRadius: 6,
                    transition: 'width 0.5s ease'
                  }} />
                </div>
              </div>

              {/* Details Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  ['Course', fee.course_name],
                  ['Batch', fee.batch_code || fee.display_name || fee.batch_number],
                  ['Total Fee', fmt(fee.total_fee)],
                  ['Amount Paid', fmt(fee.amount_paid)],
                  ['Balance Due', fmt(fee.balance)],
                  ['Status', fee.is_fully_paid ? 'Fully Paid' : 'Pending'],
                ].map(([label, value]) => (
                  <div key={label} style={{ background: T.white, borderRadius: 10, padding: '12px 16px', border: `1px solid ${T.border}` }}>
                    <div style={{ fontSize: 11, color: T.slate, fontWeight: 500, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.navy }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Pending message — no pay button, just info */}
              {!fee.is_fully_paid && (
                <div className="student-alert-warning" style={{ marginTop: 16 }}>
                  <i className="fas fa-info-circle" style={{ marginRight: 8 }} />
                  You have a pending balance of <strong>{fmt(fee.balance)}</strong>. Please contact your counselor to make the payment.
                </div>
              )}
            </div>
          </div>

          {/* Payment History */}
          {transactions.length > 0 && (
            <div className="student-card">
              <div className="student-card-header">
                <h5>📜 Payment History</h5>
                <StudentBadge text={`${transactions.length} Transactions`} variant="info" />
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="student-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Amount</th>
                      <th>Payment Mode</th>
                      <th>Notes</th>
                      <th>Date</th>
                      <th>Bill</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((t, i) => (
                      <tr key={t.id}>
                        <td style={{ color: T.slate, fontSize: 12 }}>{i + 1}</td>
                        <td style={{ fontWeight: 700, color: T.sage }}>{fmt(t.amount)}</td>
                        <td>
                          <StudentBadge
                            text={t.payment_mode?.replace('_', ' ').toUpperCase()}
                            variant="info"
                          />
                        </td>
                        <td style={{ fontSize: 12, color: T.slate }}>{t.notes || '—'}</td>
                        <td style={{ fontSize: 12 }}>
                          {t.paid_at ? new Date(t.paid_at).toLocaleDateString('en-IN') : '—'}
                        </td>
                        <td>
                          <button
                            className="student-btn student-btn-sm student-btn-success"
                            onClick={() => downloadBill(fee.id)}
                          >
                            <i className="fas fa-download" /> Bill
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Download full receipt if fully paid */}
              {fee.is_fully_paid && (
                <div style={{ padding: '16px 22px', borderTop: `1px solid ${T.border}` }}>
                  <button
                    className="student-btn student-btn-success"
                    onClick={() => downloadBill(fee.id)}
                    style={{ width: '100%' }}
                  >
                    <i className="fas fa-file-invoice" /> Download Fee Receipt
                  </button>
                </div>
              )}
            </div>
          )}

          {/* No transactions yet */}
          {transactions.length === 0 && (
            <div className="student-card">
              <StudentEmpty msg="No payments recorded yet. Contact your counselor." icon="fa-receipt" />
            </div>
          )}
        </>
      )}
    </div>
  )
}
