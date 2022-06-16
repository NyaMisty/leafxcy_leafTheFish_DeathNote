import re
import sys

fn = sys.argv[1]
with open(fn) as f:
    content = f.read()

newcontent = re.sub(r"\['\\x69\\x64'\]=(.*?)\+'\\x38',(.*?)=0x3e8", "\1='178002',\2=950", content)
assert '178002' in newcontent or newcontent != content

with open(fn, 'w') as f:
    f.write(newcontent)