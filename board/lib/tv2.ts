// TV rotation mode 2 — "split roster".
//
// Two screens only, each showing the ENTIRE roster at once by splitting it into
// two side-by-side columns (ranks 1..n/2 on the left, the remainder on the right):
//
//   S1  TODAY + ACTIVITY & PIPELINE   ranked by total pipeline size (desc)
//   S2  FUNDED PRODUCTION + ON DECK   ranked by funded + CTC+ total (desc)
//
// Because S1 is sorted by pipeline, the pipeline tier colors fall in strict
// bands down the page: dark green (>=$15M), light green (>=$10M), amber
// (>=$7.5M), then red — the whole desk's pipeline health readable at a glance.
//
// The KPI band only shows the two tiles that match the two column groups below,
// and the tile accent colors match the group header bars, so the top of the
// screen and the bottom of the screen always agree.
//
// This is additive. The standard full-width board is untouched and remains the
// default; nothing here runs unless the URL asks for it.
//
// URL options:
//   ?tv=2                 rotate both screens, 30s each
//   ?tv=2&sec=20          override dwell time (seconds)
//   ?tv=2&screen=s1       pin a single screen, no rotation (s1|s2)
//   ?tv=2&hours=0         ignore the viewing-hours schedule and rotate 24/7
//
// Viewing hours: rotation runs Mon-Fri 7:00am-7:00pm Arizona and holds on the
// first screen outside that, including all weekend. The data still refreshes on
// its own five-minute cycle, so Monday morning opens on current numbers.
//
// On screen there is also a dwell-time control (15s / 30s / 45s / 1m / 2m and
// Pause) that fades in on any mouse move, tap, or key press and fades back out
// after four seconds. The choice is remembered per device, so it survives the
// board's own five-minute reload. Left/right arrow keys page manually.

export const TV2_CSS = `
.tv2hide{display:none!important}
#tv2host{position:fixed;inset:0;background:var(--bg);overflow:hidden;z-index:50}
#tv2board{width:1920px;height:1080px;transform-origin:top left;position:absolute;top:0;left:0;
  display:flex;flex-direction:column;padding:20px 28px 16px;box-sizing:border-box;font-family:inherit}
.tv2track{position:absolute;top:0;left:0;right:0;height:4px;background:#dde4ec;z-index:4}
.tv2prog{position:absolute;top:0;left:0;height:4px;background:#2f6f43;width:0;z-index:5}

/* ---- header ---- */
.tv2hdr{display:flex;align-items:center;gap:20px;flex:0 0 auto}
.tv2id{display:flex;align-items:center;gap:16px;background:#fff;border:1px solid var(--line);
  border-radius:14px;padding:10px 20px 10px 14px;box-shadow:0 1px 2px rgba(16,24,40,.04)}
.tv2logo{height:54px;width:auto;display:block}
.tv2brand .t1{font-size:29px;font-weight:800;letter-spacing:-.4px;color:var(--ink);line-height:1.05}
.tv2brand .t2{font-size:18px;font-weight:600;color:#2f6f43;margin-top:2px}
.tv2days{display:flex;align-items:center;gap:11px;padding-left:20px;border-left:2px solid var(--line)}
.tv2days .n{font-size:40px;font-weight:800;color:#2f6f43;line-height:1}
.tv2days .dt{font-size:14.5px;font-weight:600;color:var(--ink)}
.tv2days .ds{font-size:12.5px;font-weight:500;color:var(--muted);margin-top:1px}
.tv2dl{display:flex;align-items:center;gap:20px;padding-left:22px;border-left:2px solid var(--line)}
.tv2dl .d{line-height:1.1}
.tv2dl .k{font-size:11px;font-weight:700;letter-spacing:.7px;color:var(--muted)}
.tv2dl .v{font-size:24px;font-weight:800;letter-spacing:-.3px;margin-top:2px}
.tv2dl .s{font-size:11.5px;font-weight:500;color:var(--muted);margin-top:1px}
.tv2dl .cd .v{color:#2a5bbf}
.tv2dl .rs .v{color:#c2740e}
.tv2dl .v.now{color:#fff;padding:1px 10px;border-radius:8px}
.tv2dl .cd .v.now{background:#2a5bbf}
.tv2dl .rs .v.now{background:#c2740e}
.tv2sec{margin-left:auto;text-align:right}
.tv2sec .s1{font-size:23px;font-weight:800;letter-spacing:.6px;color:var(--ink)}
.tv2sec .s2{font-size:12.5px;font-weight:600;color:var(--muted);margin-top:3px;letter-spacing:.5px}
.tv2dots{display:flex;gap:7px;justify-content:flex-end;margin-top:6px}
.tv2dots i{width:30px;height:5px;border-radius:3px;background:#d7dee8}
.tv2dots i.on{background:#2f6f43}
.tv2sleep{font-size:11.5px;font-weight:600;color:#96a0af;letter-spacing:.3px;white-space:nowrap}

/* ---- KPI band: exactly two tiles, one per section below ---- */
.tv2band{display:flex;gap:20px;margin-top:12px;flex:0 0 auto}
.tv2band .card{flex:1;height:156px;border-radius:14px;padding:13px 22px 12px;box-sizing:border-box;position:relative;overflow:hidden}
.tv2band .krow{display:flex;align-items:center;justify-content:space-between}
.tv2band .k-amber .pill{background:#fdf0d8;color:#8a6d0a;box-shadow:inset 0 0 0 1px #f0dcae}
.tv2band .k-green .pill.ahead,.tv2band .k-green .pill.behind{}
.tv2band .kl{font-size:14.5px;font-weight:700;letter-spacing:1px;color:var(--muted)}
.tv2band .kb{font-size:41px;font-weight:800;letter-spacing:-1px;line-height:1.05;margin-top:2px;white-space:nowrap}
.tv2band .kn{font-size:15px;font-weight:700;color:var(--muted);margin-top:6px}
.tv2band .sub{font-size:19px;font-weight:600;color:#8b95a6;letter-spacing:0}
/* every tile has the same anatomy: label row, big number, bar, three stats */
.tv2split{display:flex;margin-top:11px}
.tv2split .h{flex:1 1 0}
.tv2split .h.r{text-align:right}
.tv2split .h .k{font-size:11.5px;font-weight:700;letter-spacing:.7px;color:var(--muted)}
.tv2split .h .v{font-size:22px;font-weight:700;line-height:1.2;margin-top:2px}
.tv2bar{height:6px;border-radius:4px;background:#e6ebf2;margin-top:10px;position:relative;overflow:hidden}
.tv2bar i{display:block;height:100%;border-radius:4px}
.tv2bar .mk{position:absolute;top:-2px;width:3px;height:11px;background:#334;border-radius:2px}

/* ---- the two roster columns ---- */
/* One white panel per column, hairline rules between rows, and group identity
   carried by a colored underline under the group name rather than a filled bar.
   The pipeline tier keeps its filled chip — it is the one place on the screen
   where color is doing real work. */
.tv2grid{flex:1 1 auto;margin-top:14px;min-height:0;display:flex;gap:24px}
.tv2col{flex:1 1 0;min-width:0;background:#fff;border:1px solid var(--line);border-radius:12px;padding:6px 15px 8px}
table.tv2t{width:100%;border-collapse:separate;border-spacing:0;table-layout:fixed}
table.tv2t th{font-size:10.5px;font-weight:600;letter-spacing:.4px;color:var(--muted);text-align:right;padding:9px 6px 6px}
table.tv2t th.l{text-align:left;padding-left:4px}
table.tv2t th.gh{font-size:12px;font-weight:600;letter-spacing:1.2px;text-align:left;padding:2px 6px 7px;color:#5c6a7a}
table.tv2t th.gh span{display:block;padding-bottom:6px;border-bottom:3px solid currentColor}
table.tv2t th.gh0 span{color:#7a63c4}
table.tv2t th.gh1 span{color:#3f6cc9}
table.tv2t th.gh2 span{color:#2f9558}
table.tv2t th.gh3 span{color:#d9942c}
table.tv2t td{text-align:right;padding:0 6px;font-variant-numeric:tabular-nums;
  font-size:17.5px;font-weight:400;border-bottom:1px solid #f1f4f8}
table.tv2t tr:last-child td{border-bottom:none}
table.tv2t td.l{text-align:left;padding-left:2px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
table.tv2t td.sp,table.tv2t th.sp{padding:0;border-bottom:none}
.tv2row{height:var(--tv2rh,34px)}
table.tv2t th.rk{text-align:right;padding-right:13px}
table.tv2t td.rk{text-align:right;padding-right:13px;font-size:13px;color:#bcc5d1}
.tv2name{font-size:17.5px;font-weight:400;color:var(--ink)}
.tv2v{font-size:17.5px;font-weight:400;color:var(--ink)}
.tv2v.z{color:#ccd4de}
.tv2v.b60{color:#b03a2e}
.tv2hit{color:#127a3c;font-weight:700}
.tv2dash{color:#ccd4de}
/* Out of office. The label lives in the first TODAY cell and is allowed to
   overflow across the four empty ones beside it. A colspan would be the obvious
   way to do this, but under table-layout:fixed the browser gives a spanning cell
   a single column's width and shunts the rest of the row sideways. */
table.tv2t td.tv2ooo{position:relative;overflow:visible}
table.tv2t td.tv2ooo span{position:absolute;top:50%;transform:translate(-50%,-50%);
  padding:3px 15px;border-radius:8px;background:#eef1f6;color:#7d8798;
  font-size:12.5px;font-weight:600;letter-spacing:.9px;white-space:nowrap}
.tv2row.out .tv2name{color:#98a2b1}
.tv2chk{display:inline-flex;align-items:center;justify-content:center;
  width:29px;height:29px;border-radius:50%;font-size:18px;font-weight:700;line-height:1;
  background:#c7ecd5;color:#0b5c2c;box-shadow:inset 0 0 0 1.5px #9bdcb4}
/* Clean sweep of all four daily categories: a star rather than a check, so it
   reads as a different thing and not just a different shade, plus a gold rail
   and wash across the whole row so it carries to the back of the floor. */
.tv2chk.gold{background:#f2c33d;color:#5c4405;font-size:17px;box-shadow:inset 0 0 0 1.5px #d0a021}
.tv2row.sweep td{background:#fdf3d4}
.tv2row.sweep td.rk{box-shadow:inset 4px 0 0 #e0ab24;border-top-left-radius:7px;border-bottom-left-radius:7px}
.tv2row.sweep td:last-child{border-top-right-radius:7px;border-bottom-right-radius:7px}
.tv2row.sweep .tv2name{font-weight:700;color:#6d5205}
.tv2row.sweep .tv2v{color:#4a3a10}
.tv2chk.empty{display:none}
.tv2pk{padding:2px 10px;border-radius:8px;display:inline-block;font-weight:500;font-size:17.5px}
.tv2pk.t1{background:#127a3c;color:#fff}
.tv2pk.t2{background:#dcf3e4;color:#116b36}
.tv2pk.t3{background:#fbf2c9;color:#836607}
.tv2pk.t4{background:#fbdedb;color:#9c352f}
.tv2circle{display:inline-block;padding:2px 12px;border-radius:18px;background:#127a3c;color:#fff;font-weight:500;font-size:17.5px}
.tv2frow{display:inline-flex;align-items:center;gap:8px;justify-content:flex-end}
.tv2g5{width:48px;height:7px;border-radius:5px;background:#e6ebf2;overflow:hidden;flex:0 0 auto}
.tv2g5 i{display:block;height:100%}
.tv2g5p{font-size:11.5px;font-weight:500;color:var(--muted);width:28px;text-align:right}
.tv2lgd{display:flex;gap:20px;justify-content:flex-end;margin-top:7px;flex:0 0 auto;
  font-size:11.5px;font-weight:500;color:var(--muted)}
.tv2lgd i{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:6px;vertical-align:middle}

/* ---- dwell-time control (fades in on mouse move / tap) ---- */
.tv2ctl{position:fixed;right:18px;bottom:16px;z-index:60;display:flex;align-items:center;gap:7px;
  background:rgba(255,255,255,.96);border:1px solid var(--line);border-radius:11px;padding:7px 9px;
  box-shadow:0 2px 10px rgba(16,24,40,.12);opacity:0;pointer-events:none;transition:opacity .25s}
.tv2ctl.show{opacity:1;pointer-events:auto}
.tv2ctl .lb{font-size:11px;font-weight:700;letter-spacing:.6px;color:var(--muted);margin-right:2px}
.tv2ctl button{font:700 14px/1 inherit;color:#44506180;color:#455061;background:#f2f5f9;border:1px solid #e2e8f0;
  border-radius:8px;padding:7px 11px;cursor:pointer}
.tv2ctl button:hover{background:#e8eef6}
.tv2ctl button.on{background:#2f6f43;border-color:#2f6f43;color:#fff}
`;

export const TV2 = `
(function(){
  var Q = new URLSearchParams(location.search);
  if(Q.get('tv')!=='2') return;
  var B = window.__BOARD__ || {};
  var D = (B.rows||[]).slice();
  if(!D.length) return;
  var TODAY=B.today||{}, MTD=B.mtd||{}, K=B.kpi||{}, TIX=B.tix||{};
  var CALLS_PENDING=!!B.callsPending, TIX_PENDING=(B.tixPending===false?false:true);
  var CALLS_GOAL=75, TALK_GOAL=90, SUB_GOAL=1, TIX_GOAL=3;
  var GOAL=B.goal||100e6, PIPE_GOAL=300e6;
  var DASH={}, EXEMPT={}, OOO={};
  (B.dashAEs||[]).forEach(function(n){DASH[n]=1;});
  (B.exemptAEs||[]).forEach(function(n){EXEMPT[n]=1;});
  // Marked out of office today: no daily-goal expectation, and the TODAY cells
  // say so plainly instead of showing a row of zeros that reads as a bad day.
  (B.oooAEs||[]).forEach(function(n){OOO[n]=1;EXEMPT[n]=1;});
  var DWELL=(parseInt(Q.get('sec')||'30',10)||30)*1000;
  var PIN=(Q.get('screen')||'').toLowerCase();

  function mM(v){ if(!v) return '$0'; return '$'+(v/1e6).toFixed(2)+'M'; }
  function mK(v){ if(!v) return '$0'; return v>=1e6 ? '$'+(v/1e6).toFixed(2)+'M' : '$'+Math.round(v/1000)+'K'; }
  function mixAG(p){ var a=[224,138,23],g=[26,158,78],c=a.map(function(x,i){return Math.round(x+(g[i]-x)*(p/100));}); return 'rgb('+c[0]+','+c[1]+','+c[2]+')'; }
  // Both roster columns sit in half the screen width, so the long team names
  // are shortened here rather than being truncated with an ellipsis.
  var TEAMSHORT={'The Rainmakers':'Rainmakers','Cash Flow Commanders':'CF Commanders','Cash Flow Cowboys':'CF Cowboys','CTC Crusaders':'CTC','Bone Crushers':'Bone Crush'};
  function teamShort(tm){
    var base=(tm||'').replace(/\\s*·.*$/,'').trim(), tail=(tm||'').slice(base.length);
    return (TEAMSHORT[base]||base)+tail;
  }

  var fh=document.getElementById('fithost'); if(fh) fh.classList.add('tv2hide');
  var mr=document.getElementById('mroot'); if(mr) mr.classList.add('tv2hide');

  var host=document.createElement('div'); host.id='tv2host';
  host.innerHTML='<i class="tv2track"></i><i class="tv2prog" id="tv2prog"></i><div id="tv2board"></div>';
  document.body.appendChild(host);
  var board=document.getElementById('tv2board'), prog=document.getElementById('tv2prog');

  // Two independent sort orders — each screen is ranked by the thing it shows.
  var BY_PIPE = D.slice().sort(function(a,b){ return (b[2]-a[2]) || (b[7]-a[7]); });
  var BY_TOTAL= D.slice().sort(function(a,b){ return (b[7]-a[7]) || (b[4]-a[4]); });
  var SPLIT = Math.ceil(D.length/2);   // 40 AEs -> 20 left, 20 right

  // ---- header facts (mirrors the desktop header) ----
  var HOLIDAYS=new Set(['2026-01-01','2026-01-19','2026-02-16','2026-05-25','2026-06-19','2026-07-03','2026-09-07','2026-10-12','2026-11-11','2026-11-26','2026-12-25','2027-01-01','2027-01-18','2027-02-15','2027-05-31','2027-06-18','2027-07-05','2027-09-06','2027-10-11','2027-11-11','2027-11-25','2027-12-24','2027-12-31']);
  var MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
  function ymd(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  function fdays(s,e){var n=0,d=new Date(s);while(d<=e){var w=d.getDay();if(w>=1&&w<=5&&!HOLIDAYS.has(ymd(d)))n++;d.setDate(d.getDate()+1);}return n;}
  var now=new Date(new Date().toLocaleString('en-US',{timeZone:'America/Phoenix'}));
  var y=now.getFullYear(), m=now.getMonth();
  var first=new Date(y,m,1), last=new Date(y,m+1,0), today=new Date(y,m,now.getDate());
  var pastWire=(now.getHours()+now.getMinutes()/60)>=15;
  var total=fdays(first,last), elapsed=fdays(first,today);
  // Days left counts from tomorrow once the wire cutoff has passed, so
  // elapsed + remaining === total on every day of the month.
  var remaining=total-elapsed+(pastWire?0:1);
  if(remaining<0) remaining=0;

  // ---- viewing hours ----
  // Nobody is on the floor at 2am on a Sunday, so the board stops rotating
  // outside Mon-Fri 7:00am-7:00pm Arizona and holds on the first screen. The
  // five-minute data reload keeps running, so whatever is on screen Monday
  // morning is current, and a new deploy still lands overnight.
  var HOURS_ON = Q.get('hours') !== '0';        // ?hours=0 rotates around the clock
  var VIEW_START = 7, VIEW_END = 19;            // 7:00am to 7:00pm, Arizona
  function azNow(){ return new Date(new Date().toLocaleString('en-US',{timeZone:'America/Phoenix'})); }
  function withinViewingHours(){
    var d=azNow(), day=d.getDay(), h=d.getHours()+d.getMinutes()/60;
    return day>=1 && day<=5 && h>=VIEW_START && h<VIEW_END;
  }
  var DAYNAME=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  function resumeLabel(){
    var d=azNow(), h=d.getHours()+d.getMinutes()/60;
    for(var i=0;i<8;i++){
      var c=new Date(d.getFullYear(),d.getMonth(),d.getDate()+i);
      var day=c.getDay();
      if(day<1||day>5) continue;                       // weekends never open
      if(i===0 && h>=VIEW_END) continue;               // today is already over
      var when = i===0 ? 'today' : i===1 ? 'tomorrow' : DAYNAME[day];
      return 'resumes '+when+' 7:00 AM';
    }
    return '';
  }

  // ---- CD / rescission deadlines (same table and rules as the desktop board) ----
  var DEADLINES={
    '2026-07': { cd:'2026-07-23', resc:'2026-07-27' },
    '2026-08': { cd:'2026-08-22', resc:'2026-08-26' },
    '2026-09': { cd:'2026-09-22', resc:'2026-09-25' },
    '2026-10': { cd:'2026-10-23', resc:'2026-10-27' },
    '2026-11': { cd:'2026-11-20', resc:'2026-11-24' },
    '2026-12': { cd:'2026-12-22', resc:'2026-12-26' }
  };
  var _dl=DEADLINES[y+'-'+String(m+1).padStart(2,'0')]||{};
  function dlDate(s){ var p=s.split('-'); return new Date(+p[0],+p[1]-1,+p[2]); }
  function dlDays(s){ return Math.round((dlDate(s)-today)/86400000); }
  function dlChip(lbl,cls,s){
    if(!s) return '';
    var n=dlDays(s); if(n<0) return '';                       // drops off once it passes
    var when = n===0 ? 'today' : n===1 ? 'tomorrow' : 'in '+n+' days';
    var d=dlDate(s), txt=MONTHS[d.getMonth()].slice(0,3)+' '+d.getDate();
    return '<div class="d '+cls+'"><div class="k">'+lbl+'</div>'
      +'<div class="v tnum'+(n===0?' now':'')+'">'+(n===0?'TODAY':txt)+'</div>'
      +'<div class="s">'+(n===0?txt:when)+'</div></div>';
  }
  var dlBlock=dlChip('CD DEADLINE','cd',_dl.cd)+dlChip('RESCISSION','rs',_dl.resc);
  dlBlock = dlBlock ? '<div class="tv2dl">'+dlBlock+'</div>' : '';

  // ---- goal math (same rules as the desktop board) ----
  var metCount=0, goalDenom=0, subsToday=0;
  D.forEach(function(r){
    var n=r[0], td=TODAY[n]||[0,0,0], tixN=TIX[n]||0;
    var isDash=!!DASH[n]||!!OOO[n], isEx=!!EXEMPT[n];
    if(!isDash) subsToday+=td[2];
    var met=(!isDash)&&((!CALLS_PENDING&&td[0]>=CALLS_GOAL)||(!CALLS_PENDING&&td[1]>=TALK_GOAL)||td[2]>=SUB_GOAL||(!TIX_PENDING&&tixN>=TIX_GOAL));
    if(!isDash&&!isEx){ goalDenom++; if(met) metCount++; }
  });
  var goalPct=Math.round(metCount/(goalDenom||1)*100);
  var pipeActual=(K.pipeline||0)-(K.pipeSoft||0);
  var fundedPct=(K.goalElig||0)/GOAL*100, pacePct=total?elapsed/total*100:0;
  var mtdTotal=D.reduce(function(a,r){return a+(MTD[r[0]]||0);},0);

  // ---- KPI tiles ----
  // Only the two tiles that match the two column groups below are shown, and
  // every tile is built from the same four parts so the band reads as one row:
  //   label + pill  /  one big number  /  progress bar  /  three small stats.
  function tile(cls, label, pill, big, bigColor, barPct, barColor, markPct, stats){
    var h='<div class="card '+cls+'"><div class="krow"><span class="kl">'+label+'</span>'+(pill||'')+'</div>'
      +'<div class="kb tnum" style="color:'+bigColor+'">'+big+'</div>'
      +'<div class="tv2bar"><i style="width:'+Math.max(0,Math.min(100,barPct)).toFixed(1)+'%;background:'+barColor+'"></i>'
      +(markPct==null?'':'<span class="mk" style="left:'+Math.max(0,Math.min(100,markPct)).toFixed(1)+'%"></span>')+'</div>'
      +'<div class="tv2split">';
    stats.forEach(function(s,i){
      h+='<div class="h'+(i===stats.length-1?' r':'')+'"><div class="k">'+s[0]+'</div>'
        +'<div class="v tnum" style="color:'+bigColor+'">'+s[1]+'</div></div>';
    });
    return h+'</div></div>';
  }
  function tileGoal(){
    return tile('k-violet', 'TODAY&rsquo;S GOAL',
      '<span class="pill subs">'+subsToday+' sub'+(subsToday===1?'':'s')+' today</span>',
      goalPct+'%', '#4b2fa8', goalPct, '#6b4fbb', null,
      [['AES HIT', metCount+' / '+goalDenom],
       ['SUBS TODAY', String(subsToday)],
       ['TIX TODAY', TIX_PENDING?'&ndash;':String(B.tixTotal||0)],
       ['STILL TO GO', Math.max(0,goalDenom-metCount)+' AES']]);
  }
  function tilePipe(){
    var pct=pipeActual/PIPE_GOAL*100;
    return tile('k-blue', 'SALES TEAM PIPELINE',
      '<span class="pill mtd">'+mtdTotal+' MTD subs</span>',
      mM(pipeActual)+(K.pipeSoft?' <span class="sub">+ '+mM(K.pipeSoft)+' soft</span>':''), '#1f4fa8',
      pct, '#2a5bbf', null,
      [['LOCKED', mM(K.pipeLocked||0)],
       ['NOT LOCKED', mM(K.pipeUnlocked||0)],
       ['AVG PER AE', mK(pipeActual/(D.length||1))],
       ['OF $300M GOAL', pct.toFixed(1)+'%']]);
  }
  function tileFunded(){
    var behind=fundedPct<pacePct;
    return tile('k-green', 'FUNDED PRODUCTION',
      '<span class="pill '+(behind?'behind':'ahead')+'">'+(behind?'BEHIND PACE':'ON PACE')+'</span>',
      mM(K.funded||0)+' <span class="sub">&middot; '+(K.fundedUnits||0)+' units</span>', '#146c37',
      fundedPct, '#1a9e4e', pacePct,
      [['AVG FUNDED', mK((K.funded||0)/(K.fundedUnits||1))],
       ['OF $'+Math.round(GOAL/1e6)+'M GOAL', fundedPct.toFixed(1)+'%'],
       ['FUNDING DAY', elapsed+' of '+total],
       ['DAYS LEFT', String(remaining)]]);
  }
  function tileDeck(){
    // Headline is CTC+ itself — the loans actually sitting on the runway.
    // The bar runs against the same $100M goal as FUNDED PRODUCTION beside it,
    // so the two tiles are on one scale and each bar matches its own number.
    var ctc=K.ctc||0, combo=K.fundedCtc||0;
    return tile('k-amber', 'ON DECK',
      '<span class="pill mtd">'+((K.fundedUnits||0)+(K.ctcUnits||0))+' units total</span>',
      mM(ctc)+' <span class="sub">&middot; '+(K.ctcUnits||0)+' units</span>', '#b06a00',
      ctc/GOAL*100, '#e0a017', null,
      [['AVG CTC+', mK(ctc/(K.ctcUnits||1))],
       ['FUNDED + CTC+', mM(combo)],
       ['OF $'+Math.round(GOAL/1e6)+'M GOAL', (combo/GOAL*100).toFixed(1)+'%'],
       ['STILL NEEDED', mM(Math.max(0,GOAL-combo))]]);
  }

  // ---- roster columns ----
  // S1 — TODAY + ACTIVITY & PIPELINE, ranked by pipeline size.
  function colS1(rows, startRank){
    var h='<table class="tv2t"><colgroup>'
      +'<col style="width:44px"><col style="width:206px"><col style="width:14px">'
      +'<col style="width:54px"><col style="width:52px"><col style="width:36px"><col style="width:40px"><col style="width:46px"><col style="width:14px">'
      +'<col style="width:42px"><col style="width:142px"><col style="width:102px"><col style="width:94px"></colgroup>';
    h+='<tr><th class="l" colspan="2"></th><th class="sp"></th><th class="gh gh0" colspan="5"><span>TODAY</span></th><th class="sp"></th><th class="gh gh1" colspan="4"><span>ACTIVITY &amp; PIPELINE</span></th></tr>';
    h+='<tr><th class="rk">RANK</th><th class="l">ACCOUNT EXECUTIVE</th><th class="sp"></th><th>CALLS</th><th>TALK</th><th>TIX</th><th>SUB</th><th>GOAL</th><th class="sp"></th>'
      +'<th>MTD</th><th>PIPELINE</th><th>UNLOCKED</th><th>60D+</th></tr>';
    rows.forEach(function(r,i){
      var rank=startRank+i;
      var n=r[0],pipe=r[2],pipeUn=r[9]||0,b60=r[11]||0;
      var td=TODAY[n]||[0,0,0], tixN=TIX[n]||0;
      var isOoo=!!OOO[n];
      var isDash=!!DASH[n]||isOoo;
      var cHit=!isDash&&!CALLS_PENDING&&td[0]>=CALLS_GOAL, tHit=!isDash&&!CALLS_PENDING&&td[1]>=TALK_GOAL;
      var sHit=!isDash&&td[2]>=SUB_GOAL, xHit=!isDash&&!TIX_PENDING&&tixN>=TIX_GOAL;
      var met=cHit||tHit||sHit||xHit;
      var all4=cHit&&tHit&&sHit&&xHit;   // clean sweep of the four daily categories
      var dash='<span class="tv2dash">&ndash;</span>';
      var pk=pipe>=15e6?'t1':pipe>=10e6?'t2':pipe>=7.5e6?'t3':'t4';
      var todayCells = isOoo
        ? '<td class="tv2ooo"><span>OUT OF OFFICE</span></td><td></td><td></td><td></td><td></td>'
        : '<td><span class="tv2v'+(cHit?' tv2hit':'')+'">'+((isDash||CALLS_PENDING)?dash:td[0])+'</span></td>'
          +'<td><span class="tv2v'+(tHit?' tv2hit':'')+'">'+((isDash||CALLS_PENDING)?dash:Math.round(td[1]))+'</span></td>'
          +'<td><span class="tv2v'+(xHit?' tv2hit':'')+'">'+((isDash||TIX_PENDING)?dash:tixN)+'</span></td>'
          +'<td><span class="tv2v'+(sHit?' tv2hit':'')+'">'+(isDash?dash:td[2])+'</span></td>'
          +'<td>'+(isDash?dash:'<span class="tv2chk'+(all4?' gold':'')+(met?'':' empty')+'">'+(all4?'&#9733;':'&#10003;')+'</span>')+'</td>';
      h+='<tr class="tv2row'+(all4?' sweep':'')+(isOoo?' out':'')+'">'
        +'<td class="rk">'+rank+'</td><td class="l"><span class="tv2name">'+n+'</span></td><td class="sp"></td>'
        + todayCells + '<td class="sp"></td>'
        +'<td><span class="tv2v">'+(MTD[n]||0)+'</span></td>'
        +'<td><span class="tv2pk '+pk+'">'+mM(pipe)+'</span></td>'
        +'<td><span class="tv2v'+(pipeUn?'':' z')+'">'+mM(pipeUn)+'</span></td>'
        +'<td><span class="tv2v'+(b60?' b60':' z')+'">'+mM(b60)+'</span></td></tr>';
    });
    return h+'</table>';
  }

  // S2 — FUNDED PRODUCTION + ON DECK, ranked by funded + CTC+ total.
  function colS2(rows, startRank){
    var h='<table class="tv2t"><colgroup>'
      +'<col style="width:44px"><col style="width:222px"><col style="width:14px">'
      +'<col style="width:54px"><col style="width:200px"><col style="width:96px"><col style="width:14px">'
      +'<col style="width:54px"><col style="width:100px"><col style="width:88px"></colgroup>';
    h+='<tr><th class="l" colspan="2"></th><th class="sp"></th><th class="gh gh2" colspan="3"><span>FUNDED PRODUCTION</span></th><th class="sp"></th><th class="gh gh3" colspan="3"><span>ON DECK</span></th></tr>';
    h+='<tr><th class="rk">RANK</th><th class="l">ACCOUNT EXECUTIVE</th><th class="sp"></th><th>UNITS</th><th>FUNDED / $3M</th><th>AVG</th><th class="sp"></th>'
      +'<th>UNITS</th><th>CTC+</th><th>TOTAL</th></tr>';
    rows.forEach(function(r,i){
      var rank=startRank+i;
      var n=r[0],u=r[3],f=r[4],avg=r[5],ctc=r[6],tot=r[7],ctcU=r[8];
      var fp=Math.min(100,Math.round(f/3e6*100));
      var fcell = f>=3e6 ? '<span class="tv2circle">'+mM(f)+'</span>'
        : '<span class="tv2frow"><span class="tv2v">'+mM(f)+'</span><span class="tv2g5"><i style="width:'+fp+'%;background:'+mixAG(fp)+'"></i></span><span class="tv2g5p">'+fp+'%</span></span>';
      h+='<tr class="tv2row">'
        +'<td class="rk">'+rank+'</td><td class="l"><span class="tv2name">'+n+'</span></td><td class="sp"></td>'
        +'<td><span class="tv2v">'+u+'</span></td>'
        +'<td>'+fcell+'</td>'
        +'<td><span class="tv2v">'+mK(avg)+'</span></td><td class="sp"></td>'
        +'<td><span class="tv2v'+(ctcU?'':' z')+'">'+ctcU+'</span></td>'
        +'<td><span class="tv2v'+(ctc?'':' z')+'">'+mM(ctc)+'</span></td>'
        +'<td><span class="tv2v" style="color:#0f3d24">'+mM(tot)+'</span></td></tr>';
    });
    return h+'</table>';
  }

  var TIERLBL=[['#127a3c','$15M+'],['#dcf3e4','$10M+'],['#fbf2c9','$7.5M+'],['#fbdedb','under $7.5M']];
  var LEGEND='<div class="tv2lgd">'+TIERLBL.map(function(t){
    return '<span><i style="background:'+t[0]+(t[0]==='#127a3c'?'':';box-shadow:inset 0 0 0 1px rgba(0,0,0,.08)')+'"></i>'+t[1]+'</span>';
  }).join('')+'</div>';

  var SCREENS=[
    {id:'s1', name:'TODAY &amp; PIPELINE',   sub:'RANKED BY PIPELINE SIZE',        data:BY_PIPE,  band:function(){return tileGoal()+tilePipe();},   col:colS1, legend:true},
    {id:'s2', name:'FUNDED &amp; ON DECK',   sub:'RANKED BY FUNDED + CTC+ TOTAL',  data:BY_TOTAL, band:function(){return tileFunded()+tileDeck();}, col:colS2}
  ];
  if(PIN){ var f=SCREENS.filter(function(s){return s.id===PIN;}); if(f.length) SCREENS=f; }

  function draw(idx){
    var s=SCREENS[idx];
    var L=s.data.slice(0,SPLIT), R=s.data.slice(SPLIT);
    var asleep = HOURS_ON && !awake();
    var dots = asleep
      ? '<div class="tv2sleep">Rotation paused &middot; '+resumeLabel()+'</div>'
      : SCREENS.map(function(_,j){return '<i class="'+(j===idx?'on':'')+'"></i>';}).join('');
    var hdr='<div class="tv2hdr">'
      +'<div class="tv2id"><img class="tv2logo" src="/logo.png" alt="Oaktree Funding Corp">'
      +'<div class="tv2brand"><div class="t1">'+(B.title||'Sales Production')+'</div><div class="t2">'+MONTHS[m]+' '+y+'</div></div></div>'
      +'<div class="tv2days"><span class="n tnum">'+remaining+'</span><div><div class="dt">funding days left</div>'
      +'<div class="ds">of '+total+' in '+MONTHS[m]+(pastWire?' &middot; wire cut':'')+' &middot; upd '+(B.updatedLabel||'—')+' &middot; calls '+(B.callsUpdatedLabel||'—')+'</div></div></div>'
      + dlBlock
      +'<div class="tv2sec"><div class="s1">'+s.name+'</div>'
      +'<div class="s2">'+s.sub+' &middot; '+D.length+' AES</div>'
      +'<div class="tv2dots">'+dots+'</div></div></div>';
    board.innerHTML = hdr
      + '<div class="tv2band">'+s.band()+'</div>'
      + '<div class="tv2grid"><div class="tv2col">'+s.col(L,1)+'</div><div class="tv2col">'+s.col(R,SPLIT+1)+'</div></div>'
      + (s.legend ? LEGEND : '');

    // Centre each OUT OF OFFICE label across the five TODAY cells. Measured
    // rather than computed: the browser does not always hand out exactly the
    // widths the colgroup asks for, so arithmetic on the declared numbers ends
    // up a few pixels off.
    [].forEach.call(board.querySelectorAll('td.tv2ooo'), function(td){
      var cells=td.parentNode.cells, sp=td.querySelector('span');
      if(!sp || cells.length<8) return;
      var l=cells[3].getBoundingClientRect().left, r=cells[7].getBoundingClientRect().right;
      sp.style.left=((l+r)/2 - td.getBoundingClientRect().left)+'px';
    });

    // size rows to exactly fill the space left under the tiles
    var grid=board.querySelector('.tv2grid'), colEl=grid.querySelector('.tv2col'), tb=colEl.querySelector('table.tv2t');
    var hdrH=tb.rows[0].offsetHeight+tb.rows[1].offsetHeight;
    // the column panel's own padding and border eat into the space the rows get
    var cs=getComputedStyle(colEl);
    var chrome=parseFloat(cs.paddingTop)+parseFloat(cs.paddingBottom)+parseFloat(cs.borderTopWidth)+parseFloat(cs.borderBottomWidth);
    var nRows=Math.max(L.length,R.length);
    if(nRows>0){
      var rh=Math.floor((grid.clientHeight-hdrH-chrome-2)/nRows);
      board.style.setProperty('--tv2rh', Math.max(20,Math.min(52,rh))+'px');
    }
    if(SCREENS.length>1 && !paused && awake()){
      prog.style.transition='none'; prog.style.width='0';
      void prog.offsetWidth;
      prog.style.transition='width '+(DWELL/1000)+'s linear'; prog.style.width='100%';
    } else {
      prog.style.transition='none'; prog.style.width='0';
    }
    fit();
  }

  function fit(){
    var sx=window.innerWidth/1920, sy=window.innerHeight/1080, s=Math.min(sx,sy);
    board.style.transform='scale('+s+')';
    board.style.left=Math.max(0,(window.innerWidth-1920*s)/2)+'px';
    board.style.top=Math.max(0,(window.innerHeight-1080*s)/2)+'px';
  }
  window.addEventListener('resize',fit);

  // ---- rotation timer + on-screen dwell control ----
  // The dwell can be set three ways, in priority order: ?sec= in the URL, a
  // button on screen, or the 30s default. A button press is remembered in
  // localStorage so the TV keeps the choice across the 5-minute page reloads.
  var STORE='tv2.dwell';
  if(!Q.get('sec')){
    try{ var sv=parseInt(localStorage.getItem(STORE)||'',10); if(sv>0) DWELL=sv*1000; }catch(e){}
  }
  var idx=0, timer=null, paused=false, forced=false;
  // awake = inside viewing hours, or someone pressed a speed button just now
  function awake(){ return !HOURS_ON || forced || withinViewingHours(); }

  function schedule(){
    if(timer){ clearTimeout(timer); timer=null; }
    if(paused || SCREENS.length<2 || !awake()) return;
    timer=setTimeout(function(){ go(idx+1); }, DWELL);
  }

  // Checks once a minute so the board starts itself at 7:00am without waiting
  // for anyone to touch it, and stops itself at 7:00pm.
  setInterval(function(){
    var on=awake();
    if(on && !timer && !paused) draw(idx), schedule();
    else if(!on && timer) { clearTimeout(timer); timer=null; draw(idx); }
  }, 60000);
  function go(i){
    idx=((i%SCREENS.length)+SCREENS.length)%SCREENS.length;
    draw(idx);
    schedule();
  }

  var CHOICES=[15,30,45,60,120];
  var ctl=document.createElement('div');
  ctl.className='tv2ctl';
  ctl.innerHTML='<span class="lb">ROTATE EVERY</span>'
    + CHOICES.map(function(v){ return '<button data-sec="'+v+'">'+(v<60?v+'s':(v/60)+'m')+'</button>'; }).join('')
    + '<button data-act="pause">Pause</button>';
  document.body.appendChild(ctl);

  function paintCtl(){
    var secs=Math.round(DWELL/1000);
    [].forEach.call(ctl.querySelectorAll('button'), function(b){
      if(b.dataset.act==='pause'){ b.classList.toggle('on', paused); b.textContent = paused ? 'Resume' : 'Pause'; }
      else b.classList.toggle('on', !paused && +b.dataset.sec===secs);
    });
  }
  ctl.addEventListener('click', function(e){
    var b=e.target.closest('button'); if(!b) return;
    e.stopPropagation();
    if(b.dataset.act==='pause'){ paused=!paused; }
    else {
      DWELL=(+b.dataset.sec)*1000; paused=false; forced=true;   // manual override until the next reload
      try{ localStorage.setItem(STORE, b.dataset.sec); }catch(e2){}
    }
    paintCtl();
    if(paused){ if(timer){clearTimeout(timer);timer=null;} prog.style.transition='none'; prog.style.width='0'; }
    else draw(idx), schedule();
    bump();
  });

  // The control hides itself so the TV shows a clean board; any mouse movement,
  // tap, or key press brings it back for a few seconds.
  var hideT=null, over=false;
  function bump(){
    ctl.classList.add('show');
    if(hideT) clearTimeout(hideT);
    if(over) return;                       // never fade while you are on it
    hideT=setTimeout(function(){ if(!over) ctl.classList.remove('show'); }, 8000);
  }
  ctl.addEventListener('mouseenter', function(){ over=true; if(hideT) clearTimeout(hideT); });
  ctl.addEventListener('mouseleave', function(){ over=false; bump(); });
  ['mousemove','touchstart','keydown'].forEach(function(ev){ document.addEventListener(ev, bump, {passive:true}); });

  // Manual paging, for anyone standing at the screen.
  document.addEventListener('keydown', function(e){
    if(e.key==='ArrowRight'||e.key===' ') go(idx+1);
    else if(e.key==='ArrowLeft') go(idx-1);
  });

  paintCtl();
  draw(0);
  schedule();
})();
`;
