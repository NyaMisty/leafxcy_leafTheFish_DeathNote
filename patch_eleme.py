import re
import sys

fn = sys.argv[1]
with open(fn) as f:
    content = f.read()

newcontent = re.sub(r"(\['\\x69\\x64'\])=.*?\+'\\x38',(.*?)=0x3e8", r"\1='178002',\2=950", content)
assert '178002' in newcontent or newcontent != content

newcontent = newcontent.replace(
    '*/\n', 
    #"*/\nvar bootstrap = require('global-agent').bootstrap; bootstrap();\n"
    """\
*/
var hpagent = require('hpagent')
var agentOpt = {
  keepAlive: true,
  keepAliveMsecs: 2000,
  maxSockets: Infinity,
  maxFreeSockets: 256,
  proxy: process.env.HTTP_PROXY
}
var __got = require("got")
var _got_new = __got.extend({
    agent: {
        http: new hpagent.HttpProxyAgent(Object.assign({}, agentOpt)),
        https: new hpagent.HttpsProxyAgent(Object.assign({}, agentOpt)),
    }
})
var _require = require
require = (a) => {
    if (a == 'got') return _got_new;
    return _require(a)
}

"""
)

with open(fn, 'w') as f:
    f.write(newcontent)