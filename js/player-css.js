/* player-css.js — estilo do simulador de conversa (celular). Fica em uma string
   para poder ser embutido no HTML exportado para o cliente. Sem crases nem ${ } aqui dentro. */
var PLAYER_CSS = `
.cp-root{--cp-bg:#efeae2;--cp-bot:#ffffff;--cp-user:#d9fdd3;--cp-head:#0f766e;--cp-ink:#111b21;--cp-mute:#667781;--cp-accent:#0e8f83;--cp-btn:#0b7a70;
  font-family:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:var(--cp-ink);width:100%;height:100%;display:flex;justify-content:center;align-items:center}
.cp-phone{position:relative;display:flex;flex-direction:column;width:100%;max-width:380px;height:100%;max-height:720px;min-height:420px;background:var(--cp-bg);
  border-radius:26px;overflow:hidden;box-shadow:0 0 0 8px #101820,0 18px 40px rgba(16,24,32,.35)}
.cp-head{display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--cp-head);color:#fff;flex:none}
.cp-avatar{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.2);display:grid;place-items:center;font-weight:700;font-size:16px}
.cp-who{flex:1;min-width:0;line-height:1.2}.cp-who b{display:block;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cp-who small{opacity:.8;font-size:11.5px}
.cp-ico{background:none;border:0;color:#fff;cursor:pointer;width:32px;height:32px;border-radius:50%;font-size:17px;display:grid;place-items:center}
.cp-ico:hover{background:rgba(255,255,255,.18)}
.cp-chat{flex:1;overflow-y:auto;padding:14px 12px 8px;display:flex;flex-direction:column;gap:6px;scroll-behavior:smooth;
  background-image:radial-gradient(rgba(0,0,0,.045) 1px,transparent 1px);background-size:14px 14px}
.cp-msg{display:flex;flex-direction:column;max-width:86%;animation:cp-pop .18s ease-out}
.cp-bot{align-self:flex-start;align-items:flex-start}.cp-user{align-self:flex-end;align-items:flex-end}
.cp-b{position:relative;padding:7px 10px 5px;border-radius:10px;box-shadow:0 1px 1px rgba(0,0,0,.12);line-height:1.38;word-wrap:break-word;overflow-wrap:anywhere}
.cp-bot .cp-b{background:var(--cp-bot);border-top-left-radius:2px}.cp-user .cp-b{background:var(--cp-user);border-top-right-radius:2px}
.cp-t b{font-weight:700}.cp-hd{font-weight:700;margin-bottom:2px}.cp-ft{color:var(--cp-mute);font-size:12px;margin-top:4px}
.cp-time{display:block;text-align:right;font-size:10.5px;color:var(--cp-mute);margin-top:2px}
.cp-ph{background:rgba(14,143,131,.14);color:var(--cp-btn);border-radius:4px;padding:0 4px;font-size:.92em}
.cp-ph:before{content:"\\27E8"}.cp-ph:after{content:"\\27E9"}
.cp-tag{display:none;font-size:10.5px;color:var(--cp-accent);font-weight:700;letter-spacing:.02em;margin-bottom:3px;text-transform:uppercase}
.cp-show-nodes .cp-tag{display:block}
.cp-btns{display:flex;flex-direction:column;gap:4px;margin-top:4px;width:100%;min-width:200px}
.cp-btn{border:0;background:var(--cp-bot);color:var(--cp-btn);font:inherit;font-weight:600;padding:9px 10px;border-radius:9px;cursor:pointer;box-shadow:0 1px 1px rgba(0,0,0,.12);text-align:center}
.cp-btn:hover{background:#f4fbfa}.cp-used .cp-btn{opacity:.55;cursor:default;pointer-events:none}.cp-used .cp-btn.cp-chosen{opacity:1;background:#e5f6f3}
.cp-note{align-self:center;max-width:92%;text-align:center;font-size:12px;color:#54656f;background:rgba(255,244,196,.95);border-radius:8px;padding:5px 10px;box-shadow:0 1px 1px rgba(0,0,0,.08)}
.cp-note.cp-end{background:rgba(225,232,236,.95)}.cp-note.cp-warn{background:#ffe3e0;color:#8a1c12}
.cp-sim{align-self:center;display:flex;gap:6px;align-items:center;font-size:12px;color:var(--cp-mute);flex-wrap:wrap;justify-content:center}
.cp-chip{border:1px solid #b7c4c9;background:#fff;border-radius:999px;padding:5px 12px;font:inherit;font-size:12.5px;font-weight:600;cursor:pointer;color:#26343b}
.cp-chip:hover{background:#eef7f6}.cp-chip.cp-ok{border-color:#86c9a3;color:#1d7a46}.cp-chip.cp-fail{border-color:#e8a7a0;color:#a3281d}
.cp-sim.cp-used{opacity:.5;pointer-events:none}
.cp-typing{align-self:flex-start;background:#fff;border-radius:10px;border-top-left-radius:2px;padding:10px 12px;display:flex;gap:4px;box-shadow:0 1px 1px rgba(0,0,0,.12)}
.cp-typing i{width:6px;height:6px;border-radius:50%;background:#9aa8ae;animation:cp-blink 1s infinite ease-in-out}
.cp-typing i:nth-child(2){animation-delay:.15s}.cp-typing i:nth-child(3){animation-delay:.3s}
.cp-composer{display:flex;gap:8px;padding:8px 10px 12px;background:var(--cp-bg);flex:none}
.cp-composer input{flex:1;border:0;border-radius:22px;padding:11px 14px;font:inherit;background:#fff;outline:none;min-width:0;box-shadow:0 1px 1px rgba(0,0,0,.1)}
.cp-composer button{width:42px;height:42px;border:0;border-radius:50%;background:var(--cp-btn);color:#fff;cursor:pointer;font-size:17px;flex:none}
.cp-composer button:disabled{background:#9db7b3;cursor:default}
.cp-sheet{position:absolute;inset:0;background:rgba(0,0,0,.4);display:none;align-items:flex-end;z-index:5}
.cp-sheet.cp-open{display:flex}
.cp-card{background:#fff;width:100%;max-height:78%;border-radius:18px 18px 0 0;display:flex;flex-direction:column;animation:cp-up .2s ease-out}
.cp-card-h{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;font-weight:700;border-bottom:1px solid #e6ecef}
.cp-card-h button{border:0;background:none;font-size:20px;cursor:pointer;color:var(--cp-mute)}
.cp-rows{overflow-y:auto;padding:4px 0 14px}
.cp-row{display:block;width:100%;text-align:left;border:0;background:none;padding:11px 16px;font:inherit;cursor:pointer;border-bottom:1px solid #f0f3f4}
.cp-row:hover{background:#f4fbfa}.cp-row b{display:block;font-weight:600}.cp-row small{color:var(--cp-mute)}
@keyframes cp-pop{from{opacity:0;transform:translateY(6px) scale(.98)}to{opacity:1;transform:none}}
@keyframes cp-up{from{transform:translateY(40px);opacity:.6}to{transform:none;opacity:1}}
@keyframes cp-blink{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-2px)}}
`;
