// Styling for the /ooo screen. Deliberately phone-first: large tap targets,
// one column, native date pickers. Shares the board's palette so it reads as
// part of the same product.
export const OOO_CSS = `
:root{--page:#e9edf3;--card:#fff;--ink:#17233d;--ink2:#5c6a7a;--muted:#8b95a6;--line:#e5e9f0;--green:#2f6f43}
*{box-sizing:border-box}
body{margin:0;background:var(--page);color:var(--ink);
  font-family:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}
.oo-wrap{max-width:640px;margin:0 auto;padding:20px 16px 56px}
.oo-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:16px}
.oo-head h1{font-size:26px;font-weight:800;letter-spacing:-.4px;margin:0}
.oo-sub{font-size:14px;color:var(--ink2);margin:6px 0 0;line-height:1.4}
.oo-back{flex:0 0 auto;font-size:14px;font-weight:700;color:var(--green);text-decoration:none;
  border:1px solid var(--line);background:#fff;border-radius:10px;padding:9px 14px;margin-top:2px}
.oo-warn{background:#fdf3d4;border:1px solid #ecd88f;color:#6d5205;border-radius:12px;
  padding:12px 14px;font-size:14px;line-height:1.45;margin-bottom:16px}
.oo-card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px;margin-bottom:16px}
.oo-card h2{font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin:0 0 12px}
.oo-empty{font-size:15px;color:var(--muted);margin:0}
.oo-list{list-style:none;margin:0;padding:0}
.oo-list li{display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid #f1f4f8}
.oo-list li:last-child{border-bottom:none}
.oo-name{font-size:17px;font-weight:600;flex:0 0 auto}
.oo-span{font-size:13.5px;color:var(--muted);flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.oo-x{flex:0 0 auto;font:600 13px/1 inherit;color:#a03530;background:#fbdedb;border:1px solid #f2c7c2;
  border-radius:9px;padding:9px 12px;cursor:pointer}
.oo-x:disabled{opacity:.5}
.oo-form{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.oo-form label{display:flex;flex-direction:column;gap:6px;font-size:12.5px;font-weight:700;
  letter-spacing:.4px;color:var(--ink2);text-transform:uppercase}
.oo-form label em{font-style:normal;font-weight:600;color:var(--muted);text-transform:none;letter-spacing:0}
.oo-form .oo-wide{grid-column:1 / -1}
.oo-form select,.oo-form input{font:400 17px/1.2 inherit;color:var(--ink);background:#fff;
  border:1px solid #d9e0ea;border-radius:10px;padding:13px 12px;width:100%;min-height:48px}
.oo-form select:focus,.oo-form input:focus{outline:2px solid #b9cdf0;outline-offset:1px;border-color:#7ba0dd}
.oo-go{margin-top:14px;width:100%;min-height:52px;font:700 17px/1 inherit;color:#fff;background:var(--green);
  border:none;border-radius:11px;cursor:pointer}
.oo-go:disabled{background:#a8bdb0;cursor:default}
.oo-err{color:#a03530;font-size:14px;font-weight:600;margin:12px 0 0}
.oo-hint{font-size:13px;color:var(--muted);margin:12px 0 0;line-height:1.45}
@media (max-width:520px){
  .oo-form{grid-template-columns:1fr}
  .oo-head h1{font-size:23px}
  .oo-list li{flex-wrap:wrap;gap:6px 12px}
  .oo-span{flex-basis:100%;order:3}
}
`;
