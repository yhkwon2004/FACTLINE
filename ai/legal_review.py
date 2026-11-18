"""Evidence coverage questions, never a finding that legal elements are satisfied."""
import re
ISSUES=[
 ('금전·차용','돈|만원|송금|차용|빌려|투자|계좌',[
  ('재산 이전','송금|입금|지급|보냈|교부','계좌 원본과 금액·수취인을 확인하세요.'),
  ('거래 당시 설명','거짓|속였|기망|약속|설명','돈을 보내기 전에 들은 구체적 설명과 원문이 필요합니다.'),
  ('설명과 지급의 연결','믿고|때문에|그래서','그 설명을 믿고 지급했는지 당시 자료를 확인하세요.'),
  ('당시 사정','변제|갚을|능력|의사','거래 당시 의사·능력과 단순 미변제를 구분해야 합니다.')],
  ['형법 제347조','민법 제750조'],'단순 송금이나 미변제만으로 사기를 판단할 수 없습니다.'),
 ('신체 행위','때렸|맞았|폭행|밀쳤|상해|다쳤',[
  ('구체적 행위','때렸|맞았|밀쳤|잡아|발로|주먹','행위자·상대방과 구체적 행동을 대조하세요.'),
  ('피해와 경위','진단|상처|다쳤|치료|통증','진료 기록, 사진, 발생 경위를 함께 확인하세요.'),
  ('다른 근거','목격|영상|녹음|사진|메시지','독립된 원본과 진술 간 일치·차이를 확인하세요.')],
  ['형법 제260조','형법 제257조','민법 제750조'],'형사·민사·학교 조치의 요건과 증명 기준은 다릅니다.'),
 ('위협 표현','협박|죽이|해치|가만두지',[
  ('표현 원문','죽이|해치|가만두지|협박','앞뒤 대화와 정확한 표현을 보관하세요.'),
  ('전달과 맥락','문자|메시지|전화|직접|대화','누가 누구에게 어떤 상황에서 전달했는지 확인하세요.')],
  ['형법 제283조'],'표현의 맥락·전달 경위와 사건 당시 법령을 확인해야 합니다.')]

def review(text,corpus):
    found=[]
    for title,trigger,checks,citations,note in ISSUES:
        if not re.search(trigger,text):continue
        rows=[]
        for label,pattern,question in checks:
            match=re.search(r'[^\n.!?]*(?:'+pattern+r')[^\n.!?]*',text)
            rows.append(dict(label=label,status='mentioned' if match else 'missing',quote=match.group().strip()[:300] if match else None,question=question))
        refs=[]
        for cite in citations:
            law,article=cite.split(' ')
            item=next((c for c in corpus if c['title']==law and re.search(r'(?<!\d)'+article+r'\s*\(',c['citation'])),None)
            if item:refs.append(item)
        found.append(dict(title=title,checks=rows,references=refs,note=note))
    return dict(issues=found,notice='언급 여부를 찾는 확인 목록입니다. 사실 인정·법률 요건 충족·승소 확률을 계산하지 않습니다.')

if __name__=='__main__':
    r=review('김민수가 이서연에게 5만원을 송금했다.',[])
    assert r['issues'][0]['checks'][0]['status']=='mentioned'
    assert r['issues'][0]['checks'][1]['status']=='missing'
    assert not review('도서관에서 공부했다.',[])['issues']
    print('PASS source coverage separates payment from deception and intent')
