"""Refresh news in protected storage. Never commit member research to Pages."""
import json, os, urllib.request
from pathlib import Path
import update_asset_news
ENDPOINT='https://zkyhhoxcrjkhywblzehr.supabase.co/functions/v1/member-research'
def request(payload=None):
    key=os.environ['RESEARCH_PUBLISH_KEY']
    req=urllib.request.Request(ENDPOINT,data=json.dumps(payload).encode() if payload else None,headers={'x-publish-key':key,'Content-Type':'application/json'})
    with urllib.request.urlopen(req,timeout=60) as response:return json.load(response)
def main():
    root=Path(__file__).resolve().parents[1]
    current=request()
    private=root/'.private-research';private.mkdir(exist_ok=True)
    (private/'asset-news.json').write_text(json.dumps(current.get('news',{'items':[]})))
    update_asset_news.main()
    fresh=json.loads((private/'asset-news.json').read_text())
    result=request({'id':'news','payload':fresh})
    if result.get('ok') is not True:raise RuntimeError('Publication not confirmed')
    print('Protected news publication verified.')
if __name__=='__main__':main()
