export const CLIENT = `
(function(){
  var B = window.__BOARD__ || {};
  var D = (B.rows||[]).slice();
  var TODAY = B.today||{}, MTD_SUBS = B.mtd||{}, K = B.kpi||{};
  var CALLS_PENDING = !!B.callsPending;
  var CALLS_GOAL=75, TALK_GOAL=90, SUB_GOAL=1, GOAL=100e6;
  var BROKERS_PENDING=true, YTD_BROKERS={};
  function $(id){return document.getElementById(id);}
  function mM(v){ if(!v) return '$0'; return '$'+(v/1e6).toFixed(2)+'M'; }
  function mK(v){ if(!v) return '$0'; return v>=1e6 ? '$'+(v/1e6).toFixed(2)+'M' : '$'+Math.round(v/1000)+'K'; }
  function mixAG(p){ var a=[224,138,23],g=[26,158,78],c=a.map(function(x,i){return Math.round(x+(g[i]-x)*(p/100));}); return 'rgb('+c[0]+','+c[1]+','+c[2]+')'; }

  if(!D.length){
    $('titlemonth').textContent = '';
    document.querySelector('.goals').innerHTML = '<div class="banner">'+(B.error==='no-credentials'?'Waiting on credentials — add the service account env vars in Vercel and redeploy.':'Waiting for the first Sales Board file to appear in Drive.')+'</div>';
  }

  // ---- KPI tiles ----
  $('pipebig').textContent = mM(K.pipeline||0);
  var lp = Math.round(K.lockedPct||0);
  $('lockv').innerHTML = mM(K.pipeLocked||0)+' <span>&middot; '+lp+'%</span>';
  $('unlockv').innerHTML = mM(K.pipeUnlocked||0)+' <span>&middot; '+(100-lp)+'%</span>';
  $('fundbig').innerHTML = mM(K.funded||0)+' <span>&middot; '+(K.fundedUnits||0)+'</span>';
  $('ctcv').innerHTML = mM(K.ctc||0)+' <span>&middot; '+(K.ctcUnits||0)+'</span>';
  $('fctcv').textContent = mM(K.fundedCtc||0);
  $('clocktime').textContent = B.updatedLabel || '—';
  $('callclocktime').textContent = B.callsUpdatedLabel || '—';

  // ---- table ----
  D.sort(function(a,b){return b[7]-a[7];});
  var sp='<td class="sp"></td>';
  var h='<colgroup>'
   +'<col style="width:380px"><col style="width:8px">'
   +'<col style="width:94px"><col style="width:94px"><col style="width:94px"><col style="width:94px"><col style="width:8px">'
   +'<col style="width:112px"><col style="width:112px"><col style="width:112px"><col style="width:8px">'
   +'<col style="width:76px"><col style="width:158px"><col style="width:106px"><col style="width:8px">'
   +'<col style="width:186px"><col style="width:186px"></colgroup>';
  var metCount=0, subsToday=0;
  h+='<tr><th class="l"></th>'+sp
   +'<th class="grouphdr gh0" colspan="4">TODAY</th>'+sp
   +'<th class="grouphdr gh1" colspan="3">ACTIVITY &amp; PIPELINE</th>'+sp
   +'<th class="grouphdr gh2" colspan="3">FUNDED PRODUCTION</th>'+sp
   +'<th class="grouphdr gh3" colspan="2">ON DECK</th></tr>';
  h+='<tr><th class="l">AE</th>'+sp
   +'<th>OUT CALLS</th><th>TALK MIN</th><th>SUBS</th><th>GOAL</th>'+sp
   +'<th>MTD SUBS</th><th>PIPELINE</th><th>YTD BROKERS</th>'+sp
   +'<th>UNITS</th><th>FUNDED / $3M</th><th>AVG FUNDED</th>'+sp
   +'<th>CTC+</th><th>TOTAL</th></tr>';
  D.forEach(function(r,i){
    var n=r[0],tm=r[1],pipe=r[2],u=r[3],f=r[4],avg=r[5],ctc=r[6],tot=r[7];
    var fp=Math.min(100,Math.round(f/3e6*100));
    var fcell = f>=3e6 ? '<div class="circle">'+mM(f)+'</div>'
      : '<span class="frow"><span class="mval">'+mM(f)+'</span><span class="g5bar"><i style="width:'+fp+'%;background:'+mixAG(fp)+'"></i></span><span class="g5pct">'+fp+'%</span></span>';
    var pk = pipe>=15e6?' pk pk-best':pipe>=10e6?' pk pk-good':pipe>=7.5e6?' pk pk-decent':'';
    var td=TODAY[n]||[0,0,0];
    var calls=td[0], talk=td[1], sub=td[2];
    subsToday+=sub;
    var cHit=!CALLS_PENDING&&calls>=CALLS_GOAL, tHit=!CALLS_PENDING&&talk>=TALK_GOAL, sHit=sub>=SUB_GOAL;
    var met=cHit||tHit||sHit; if(met) metCount++;
    var callsTxt=CALLS_PENDING?'<span class="pend">&ndash;</span>':'<span class="tsub'+(cHit?' hit':'')+'">'+calls+'</span>';
    var talkTxt =CALLS_PENDING?'<span class="pend">&ndash;</span>':'<span class="tsub'+(tHit?' hit':'')+'">'+Math.round(talk)+'</span>';
    h+='<tr'+(i%2?' class="altrow"':'')+'>'
     +'<td class="l"><span class="aename">'+n+'</span><span class="aeteam">'+tm+'</span></td>'+sp
     +'<td>'+callsTxt+'</td>'
     +'<td>'+talkTxt+'</td>'
     +'<td><span class="tsub'+(sHit?' hit':'')+'">'+sub+'</span></td>'
     +'<td>'+(met?'<span class="chk">&#10003;</span>':'<span class="chk empty">&#10003;</span>')+'</td>'+sp
     +'<td><span class="mval">'+(MTD_SUBS[n]||0)+'</span></td>'
     +'<td><span class="mval'+pk+'">'+mM(pipe)+'</span></td>'
     +'<td>'+(BROKERS_PENDING?'<span class="pend">&ndash;</span>':'<span class="mval">'+(YTD_BROKERS[n]||0)+'</span>')+'</td>'+sp
     +'<td><span class="mval">'+u+'</span></td>'
     +'<td>'+fcell+'</td>'
     +'<td><span class="mval">'+mK(avg)+'</span></td>'+sp
     +'<td><span class="mval'+(ctc?'':' z')+'">'+mM(ctc)+'</span></td>'
     +'<td><span class="tot">'+mM(tot)+'</span></td>'
     +'</tr>';
  });
  var tbl=$('tbl'); if(tbl) tbl.innerHTML=h;
  var denom=D.length||1;
  var pct=Math.round(metCount/denom*100);
  $('goalpct').textContent=pct+'%';
  $('goalbar').style.width=pct+'%';
  $('goalsub').innerHTML=metCount+' of '+D.length+' hit &mdash; sub, '+CALLS_GOAL+'+ calls, or '+TALK_GOAL+'+ min talk'+(CALLS_PENDING?' <span style="color:var(--amber-ink)">&middot; calls pending</span>':'');
  $('subpill').textContent=subsToday+' sub'+(subsToday===1?'':'s')+' today';
  var mtdTotal=D.reduce(function(a,r){return a+(MTD_SUBS[r[0]]||0);},0);
  $('mtdpill').textContent=mtdTotal+' MTD subs';

  // ---- funding-day + pace (Arizona time) ----
  var HOLIDAYS=new Set(['2026-01-01','2026-01-19','2026-02-16','2026-05-25','2026-06-19','2026-07-03','2026-09-07','2026-10-12','2026-11-11','2026-11-26','2026-12-25','2027-01-01','2027-01-18','2027-02-15','2027-05-31','2027-06-18','2027-07-05','2027-09-06','2027-10-11','2027-11-11','2027-11-25','2027-12-24','2027-12-31']);
  var MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
  function ymd(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  function fundingDays(s,e){var n=0,d=new Date(s);while(d<=e){var dow=d.getDay();if(dow>=1&&dow<=5&&!HOLIDAYS.has(ymd(d)))n++;d.setDate(d.getDate()+1);}return n;}
  var now=new Date(new Date().toLocaleString('en-US',{timeZone:'America/Phoenix'}));
  var y=now.getFullYear(), m=now.getMonth();
  var first=new Date(y,m,1), last=new Date(y,m+1,0), today=new Date(y,m,now.getDate());
  var total=fundingDays(first,last), elapsed=fundingDays(first,today), remaining=fundingDays(new Date(y,m,now.getDate()+1),last);
  var pacePct=total?elapsed/total*100:0, paceTarget=GOAL*(total?elapsed/total:0);
  var fundedPct=(K.goalElig||0)/GOAL*100;
  $('titlemonth').textContent=MONTHS[m]+' '+y;
  $('fdleft').textContent=remaining;
  $('fdsub').textContent='of '+total+' in '+MONTHS[m];
  $('pacefill').style.width=Math.min(100,fundedPct).toFixed(1)+'%';
  $('pacemk').style.left=pacePct.toFixed(1)+'%';
  $('fundnote').innerHTML=mM(K.goalElig||0)+' goal-eligible &middot; '+fundedPct.toFixed(1)+'% of $100M &middot; pace ~$'+(paceTarget/1e6).toFixed(2)+'M (funding day '+elapsed+' of '+total+')';
  var behind=fundedPct<pacePct, pp=$('pacepill');
  pp.textContent=behind?'BEHIND PACE':'ON PACE';
  pp.className='pill '+(behind?'behind':'ahead');

  setTimeout(function(){location.reload();}, 300000); // refresh every 5 min
})();
`;
