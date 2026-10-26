import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {root} from '../scripts/build.mjs';
test('launch configuration fails closed and reviewed details produce concise policies',()=>{
 const result=spawnSync('python3',['-c',`
import sys,tempfile,json,shutil,subprocess,os
from pathlib import Path
sys.path.insert(0,'scripts')
from site_config import load_settings,production_policies
config=json.loads(Path('config/site.json').read_text())
assert config['service_role']=='buyer'
assert 'ADAC Recovery Solutions, trading as Scrap Cars Sorted, is operated by Mr Mihail Cerchez as a sole trader' in production_policies(config)[0]
with tempfile.TemporaryDirectory() as folder:
 root=Path(folder);(root/'config').mkdir()
 def write(): (root/'config/site.json').write_text(json.dumps(config))
 config['policies_reviewed']=False
 write()
 for live,index in [(True,False),(False,True)]:
  try: load_settings(root,live,index)
  except SystemExit: pass
  else: raise AssertionError('Incomplete launch allowed')
 config.update(brand='Example Cars',legal_name='Example Ltd',sole_trader=False,business_address='Example address',contact_email='quotes@example.com',google_business_url='',licence_details='Example licence details',service_role='buyer',quote_retention='Example retention',provider_retention_and_transfers='Example provider details',policies_reviewed=True)
 write();loaded=load_settings(root,True,False)
 privacy,terms=production_policies(loaded)
 assert 'Example Ltd' in privacy and 'bank transfer' in terms
 assert 'Your sale and payment are through our business' in terms
 assert 'business receiving the vehicle from us' in privacy
 assert 'physical cash' in terms and 'No automatic' not in terms
 shutil.copytree('scripts',root/'scripts')
 shutil.copytree('public',root/'public')
 built=subprocess.run([sys.executable,str(root/'scripts/build.py')],env={**os.environ,'SITE_ORIGIN':'https://example.com','SITE_LIVE':'true','SITE_INDEXABLE':'true'},capture_output=True,text=True)
 assert built.returncode==0,built.stderr
 home=(root/'dist/index.html').read_text()
 quote=(root/'dist/quote/index.html').read_text()
 assert 'Example Cars' in home and 'LocalBusiness' in home
 assert '"sameAs"' not in home
 assert 'scrap<em>local</em>' not in home
 assert 'Website preview' not in home and 'Website preview' not in quote
 assert 'data-endpoint="/api/quote"' in quote and 'Request my quote' in quote
 assert 'Preview only' not in quote
 assert 'bank transfer' in (root/'dist/terms/index.html').read_text()
 assert 'Example Ltd' in (root/'dist/privacy/index.html').read_text()
 assert 'index, follow' in quote and 'index, follow' in home
 assert 'https://example.com/quote/' in (root/'dist/sitemap.xml').read_text()
 assert 'https://example.com/locations/birmingham/' in (root/'dist/sitemap.xml').read_text()

`],{cwd:root,encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
});
