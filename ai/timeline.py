"""Conservative Korean date parsing. Inferred years remain explicitly approximate."""
import re
from datetime import date,datetime,timedelta

def parse_date(text,reference=None,context_year=None):
 full=re.search(r'(20\d{2})[년./-]\s*(\d{1,2})[월./-]\s*(\d{1,2})일?',text)
 partial=re.search(r'(?<!\d)(\d{1,2})월\s*(\d{1,2})일',text)
 clock=re.search(r'(?:(오전|오후)\s*)?(\d{1,2})\s*(?::|시)\s*(\d{1,2})?\s*분?',text)
 result=dict(datetime=None,isApproximateTime=True,dateSource='unspecified',approximateTimeText=clock.group() if clock else None)
 ref=None
 try:ref=date.fromisoformat(reference) if reference else None
 except ValueError:return result
 try:
  source='unspecified';raw=None;day=None
  if full:day=date(*map(int,full.groups()));source='explicit';raw=full.group()
  elif partial and (context_year or ref):day=date(context_year or ref.year,int(partial[1]),int(partial[2]));source='year-from-context' if context_year else 'year-from-reference';raw=partial.group()
  elif ref:
   relative=re.search(r'그제|어제|오늘|내일|모레',text)
   week=re.search(r'(지난|이번)\s*주\s*([월화수목금토일])요일',text)
   if relative:day=ref+timedelta(days={'그제':-2,'어제':-1,'오늘':0,'내일':1,'모레':2}[relative.group()]);source='relative-to-user-date';raw=relative.group()
   elif week:day=ref-timedelta(days=ref.weekday())+timedelta(days='월화수목금토일'.index(week[2])-(7 if week[1]=='지난' else 0));source='relative-to-user-date';raw=week.group()
  if day is None:return result
  hour=minute=0
  if clock:
   hour=int(clock[2]);minute=int(clock[3] or 0)
   if clock[1] and not 1<=hour<=12:return result
   if clock[1]=='오후' and hour<12:hour+=12
   if clock[1]=='오전' and hour==12:hour=0
  value=datetime(day.year,day.month,day.day,hour,minute)
  return dict(datetime=value.strftime('%Y-%m-%dT%H:%M:00+09:00'),isApproximateTime=not bool(clock and clock[3]) or source.startswith('year-from-'),dateSource=source,approximateTimeText=(raw or '')+(' '+clock.group() if clock else '')+(' · 기준일/문맥으로 연도 확인 필요' if source.startswith('year-from-') else ''),year=day.year)
 except ValueError:return result

if __name__=='__main__':
 assert parse_date('2026년 11월 18일 오후 3시 20분 연락했다.')['datetime']=='2026-11-18T15:20:00+09:00'
 assert parse_date('지난주 화요일에 만났다.','2026-11-19')['datetime'].startswith('2026-11-10')
 assert parse_date('11월 2일 오전 9시 연락했다.','2026-11-19')['dateSource']=='year-from-reference'
 assert parse_date('2026년 2월 30일 연락했다.')['datetime'] is None
 assert parse_date('오후 3시 연락했다.')['datetime'] is None
 assert parse_date('어제 오후 15시 만났다.','2026-11-19')['datetime'] is None
 assert parse_date('오늘 오전 12시 15분','2026-11-19')['datetime']=='2026-11-19T00:15:00+09:00'
 print('PASS Korean explicit/relative/year-inferred dates, invalid dates/hours and unanchored time')
