// @grant require
/*
中青看点 定时宝箱

需要zqkdCookie，自己捉包填写，多账号@隔开，格式：
uid=12345678&zqkey=xxxxxx&zqkey_id=yyyyyyy@uid=87654321&zqkey=zzzzzzzz&zqkey_id=aaaaaa

cron: 1-59/15 * * * *
const $ = new Env('中青看点-定时宝箱');
*/
const jsname = '中青看点定时奖励'
const $ = Env(jsname)
const notifyFlag = 1; //0为关闭通知，1为打开通知,默认为1
const logDebug = 0

//const notify = $.isNode() ? require('./sendNotify') : '';
let notifyStr = ''

let currentTime = new Date();
let hour = currentTime.getHours();

let rndtime = "" //毫秒
let httpResult //global buffer

var CryptoJS = require('crypto-js');

let userCookieArr = []
let bodyArr = []

let userIdx = 0

let rotaryStep = 5

let rewardCount = []
let luckdrawNum = []
let rotaryNum = []
let rotaryBoxList = []
let shareBoxFlag = []
let shareAction = []
let videoFlag = []
let timerBoxFlag = []

let getBoxFlag = 0
let maxLuckdrawNum = 0
let maxRotaryNum = 0
let maxBoxNum = 0
let boxFlag = 0
let shareFlag = 0
let needVideo = 0

let preBody = 'p=zUJybc31G2V0%3D'

let bodyTemplate = 'app_name=zqkd_app&app_version=3.9.8&carrier=%E4%B8%AD%E5%9B%BD%E7%94%B5%E4%BF%A1&channel=c1031&device_brand=HUAWEI&device_id=55903361&device_model=TAS-AN00&device_platform=android&device_type=android&dpi=480&inner_version=202108181534&language=zh-CN&memory=7&mi=0&mobile_type=1&net_type=1&network_type=WIFI&oaid=9bdf7bff-f3fe-2b18-5fff-3b3f3fd6873d&openudid=f2111c392e056b84&os_api=29&os_version=TAS-AN00+10.0.0.133%28C00E132R5P1%29&param=box_six&request_time=1634562471&resolution=1080x2259&rom_version=TAS-AN00+10.0.0.133%28C00E132R5P1%29&s_ad=jYFg4QJ5A6eY%3Db6-Jhj-LiXHYrVhu-F48x17yWx9eEyD5&sm_device_id=2020031618154539f1a2741679d27a72c6745d9ed13e6801c4b79111353999&storage=109.35&action=task_reward_action&'

let fakeSign = '&sign=01e8102fab93e458542c5155a3b8b734'

let refHotShare = 'http://kd.youth.cn/h5/hotShare/?'
let refRotory = 'https://kd.youth.cn/html/rotaryTable/index.html?'

let key = '6HPjSZFH'

let fixStr = 'jdvylqchJZrfw0o2DgAbsmCGUapF1YChc'

///////////////////////////////////////////////////////////////////

!(async () => {

    if(typeof $request !== "undefined")
    {
        $.msg(jsname+': 此脚本不做重写，请检查重写设置')
    }
    else
    {
        if(!(await checkEnv())) {
            return
        }
        
        await InitAccountInfo()     //初始化变量
        await RunReward()           //定时宝箱
        await GetUserCardInfo()     //早起打卡
        await RunUserHotShare()     //时段火爆转发
        await RunVideo()            //任务页福利视频
        await RunUserQueryRotary()  //抽奖
        
    }
  

})()
.catch((e) => $.logErr(e))
.finally(() => $.done())

//通知
async function showmsg() {
    
    notifyBody = jsname + "运行通知\n\n" + notifyStr
    
    if (notifyFlag != 1) {
        console.log(notifyBody);
    }

    if (notifyFlag == 1) {
        $.msg(notifyBody);
        //if ($.isNode()){await notify.sendNotify($.name, notifyBody );}
    }
}

async function checkEnv() {
    let userCookie = ($.isNode() ? process.env.zqkdCookie : $.getdata('zqkdCookie')) || '';
    let splitor = userCookie.includes('@') ? '@' : '\n'
    let userCookies = userCookie.split(splitor)
    for(let cks of userCookies) if(cks) userCookieArr.push(cks)
    if(userCookieArr.length == 0) {
        console.log('未找到有效的userCookie')
        return false
    }
    
    console.log(`共找到${userCookieArr.length}个用户`)
    return true
}

async function InitAccountInfo() {
    for(userIdx=0; userIdx<userCookieArr.length; userIdx++) {
        rewardCount.push(0)
        luckdrawNum.push(0)
        rotaryNum.push(0)
        rotaryBoxList.push([])
        shareBoxFlag.push(0)
        shareAction.push('')
        videoFlag.push(0)
    }
}

function replaceCookie(userCookieItem) {
    let replaceItem = ''
    let zqkey = ''
    let zqkey_id = ''
    if(userCookieItem.indexOf('zqkey=') > -1) {
        zqkey = userCookieItem.match(/zqkey=([\w-]+)/)[1]
    } else if (userCookieItem.indexOf('cookie=') > -1) {
        zqkey = userCookieItem.match(/cookie=([\w-]+)/)[1]
    }
    if(userCookieItem.indexOf('zqkey_id=') > -1) {
        zqkey_id = userCookieItem.match(/zqkey_id=([\w-]+)/)[1]
    } else if (userCookieItem.indexOf('cookie_id=') > -1) {
        zqkey_id = userCookieItem.match(/cookie_id=([\w-]+)/)[1]
    }
    if(userCookieItem.indexOf('uid=') > -1) {
        uid = userCookieItem.match(/uid=([\w-]+)/)[1]
    }
    
    replaceItem = `uid=${uid}&version_code=63&zqkey=${zqkey}&zqkey_id=${zqkey_id}`
    
    return replaceItem
}

///////////////////////////////////////////////////////////////////
/*
async function decodeUserBody() {
    for(let i=0; i<bodyArr.length; i++) {
        deUrlBody = decodeURIComponent(bodyArr[i])
        idx1 = deUrlBody.indexOf('=')
        idx2 = deUrlBody.indexOf('=',idx1+1)
        idx3 = deUrlBody.lastIndexOf('=')
        preBody = deUrlBody.substring(0,idx2+1)
        pureBody = deUrlBody.substring(idx2+1,idx3+1)
        subBody = deUrlBody.substring(idx3+1)
        replaceBody1 = pureBody.replace(/-/g,'+')
        replaceBody2 = replaceBody1.replace(/_/g,'/')
        decodeStr = DecFunc(replaceBody2)
        decodedUserArr.push(decodeStr)
        preBodyArr.push(preBody)
        subBodyArr.push(subBody)
    }
}*/

function encodeFunc(str) {
    encodeBody = EncFunc(str)
    hexBody = CryptoJS.enc.Hex.parse(encodeBody)
    base64Body = CryptoJS.enc.Base64.stringify(hexBody)
    replaceBody3 = base64Body.replace(/\+/g,'-')
    replaceBody4 = replaceBody3.replace(/\//g,'_')
    finalBody = encodeURIComponent(replaceBody4)
    finalBody = preBody + finalBody + '=='
    //console.log(finalBody)
    return finalBody
}

function encodeRewardBody(rewardItem) {
    let replacedStr = ''
    let task_name = ''
    let action_type = `action=${rewardItem.name}`
    if(rewardItem.task) {
        if(rewardItem.type == 'reward') {
            task_name = `param=${rewardItem.task}&`
        } else if(rewardItem.type == 'double') {
            task_name = `index=${rewardItem.task}&`
        }
    }
    replacedStr = bodyTemplate.replace(/action=[\w_]+/g,action_type)
    replacedStr = replacedStr.replace(/param=[\w_]+\&/g,task_name)
    replacedStr = replacedStr+ userCookieArr[userIdx] + fakeSign
    return encodeFunc(replacedStr)
}

//统计用户信息
async function getStat() {
    console.log(`============================`)
    for(userIdx=0; userIdx<userCookieArr.length; userIdx++) {
        console.log(`账号${userIdx+1}本轮共获得了${rewardCount[userIdx]}金币`)
    }
}

//定时领奖
async function RunReward() {
    console.log(`\n查询首页定时宝箱状态`)
    for(userIdx=0; userIdx<userCookieArr.length; userIdx++) {
        GetRightCorner(userIdx)
        await $.wait(60)
    }
    await $.wait(1000)
    
    if(getBoxFlag > 1) {
        console.log(`\n准备领定时宝箱`)
        for(userIdx=0; userIdx<userCookieArr.length; userIdx++) {
            if(timerBoxFlag[userIdx] > 1) {
                let rewardItem = {name:'right_corner_time',task:'',type:'reward'}
                let body = await encodeRewardBody(rewardItem)
                GetBoxReward(body,userIdx)
                await $.wait(60)
            }
        }
    }
    
    /*
    if(getBoxFlag > 0) {
        console.log(`\n准备领视频宝箱`)
        for(userIdx=0; userIdx<userCookieArr.length; userIdx++) {
            if(timerBoxFlag[userIdx] > 0) {
                GetVideoReward(userIdx)
                await $.wait(60)
            }
        }
    }*/
}

//定时宝箱状态
async function GetRightCorner(idx) {
    let caller = printCaller()
    let url = 'https://kandian.wkandian.com/v17/Article/getRightCorner.json'
    let body = 'access=WIFI&action=right_corner_video&app-version=3.9.8&app_name=zqkd_app&app_version=3.9.8&' + userCookieArr[idx]
    let urlObject = populatePostUrl(url,body)
    await httpPost(urlObject,caller)
    let result = httpResult;
    if(!result) return
    
    if(result.success == true) {
        if(result.items.type == 1) {
            timerBoxFlag[idx] = 2
            console.log(`用户${idx+1}可以领取定时宝箱`)
            
        } else if(result.items.type == 2) {
            timerBoxFlag[idx] = 1
            console.log(`用户${idx+1}可以领取视频宝箱`)
        } else if(result.items.type == 4) {
            console.log(`用户${idx+1}宝箱冷却时间还有${result.items.last_sec}秒`)
        }
        getBoxFlag = getMax(getBoxFlag,timerBoxFlag[idx])
    } else {
        console.log(`用户${idx+1}查询宝箱状态失败：${result.message}`)
    }
}

//领取定时宝箱
async function GetBoxReward(body,idx) {
    let caller = printCaller()
    let url = 'https://kandian.wkandian.com/v5/CommonReward/toGetReward.json'
    let urlObject = populatePostUrl(url,body)
    await httpPost(urlObject,caller)
    let result = httpResult;
    if(!result) return
    
    if(result.success == true) {
        console.log(`用户${idx+1}领取宝箱成功，获得${result.items.score}金币`)
        rewardCount[idx] += parseInt(result.items.score)
    } else {
        console.log(`用户${idx+1}领取宝箱失败：${result.message}`)
    }
}

//领取视频奖励
async function GetVideoReward(idx) {
    let caller = printCaller()
    let body = 'access=WIFI&action=right_corner_video&app-version=3.9.8&app_name=zqkd_app&app_version=3.9.8&' + userCookieArr[idx]
    let urlObject = populatePostUrl(url,body)
    urlObject['headers']['Token'] = token
    await httpPost(urlObject,caller)
    let result = httpResult;
    if(!result) return
    
    if(result.success == true) {
        console.log(`用户${idx+1}领取视频奖励成功，获得${result.items.dialog.score}金币`)
        rewardCount[idx] += parseInt(result.items.dialog.score)
    } else {
        console.log(`用户${idx+1}领取视频奖励失败：${result.message}`)
    }
}

//查询所有用户打卡和抽奖信息
async function GetUserCardInfo() {
    console.log(`\n查询早起打卡状态`)
    for(userIdx=0; userIdx<userCookieArr.length; userIdx++) {
        GetPunchCardMainData(userIdx)
        await $.wait(60)
    }
    await $.wait(1000)
    
    if(maxLuckdrawNum>0) {
        console.log(`\n==== 开始连续打卡抽奖 ====`)
        for(userIdx=0; userIdx<userCookieArr.length; userIdx++) {
            if(luckdrawNum[userIdx]>0) {
                Luckdraw(userIdx)
                await $.wait(60)
            }
        }
    }
}

//查询打卡状态
async function GetPunchCardMainData(idx) {
    let caller = printCaller()
    let reqCk = userCookieArr[idx].replace(/zqkey/g,'cookie')
    let url = 'https://kd.youth.cn/WebApi/PunchCard/getMainData?' + reqCk
    let urlObject = populateGetUrl(url)
    await httpGet(urlObject,caller)
    let result = httpResult;
    if(!result) return
    
    if(result.code == 1) {
        console.log(`用户${idx+1}已连续打卡${result.data.luck.continue_card_days}天，有${result.data.luck.luckdraw_num}次抽奖机会`)
        //result.data.user.status
        //0: 未报名，1：已报名，2：未到打卡时间，3：可打卡
        if(result.data.user.status == 0 && hour >= 8) SignUp(idx)
        if(result.data.user.status == 3 && hour >=5 && hour < 8) DoCard(idx)
        if(result.data.luck.luckdraw_num > 0) luckdrawNum[idx] = result.data.luck.luckdraw_num
        maxLuckdrawNum = getMax(maxLuckdrawNum,luckdrawNum[idx])
    } else {
        console.log(`用户${idx+1}查询打卡状态错误：${result.msg}`)
    }
}

//报名明天打卡
async function SignUp(idx) {
    let caller = printCaller()
    let reqCk = userCookieArr[idx].replace(/zqkey/g,'cookie')
    let url = 'https://kd.youth.cn/WebApi/PunchCard/signUp?' + userCookieArr[idx]
    let body = ''
    let urlObject = populatePostUrl(url,body)
    urlObject['headers']['Referer'] = 'https://kd.youth.cn/h5/20190603cardactive/?' + reqCk
    await httpPost(urlObject,caller)
    let result = httpResult;
    if(!result) return
    
    if(result.code == 1) {
        console.log(`用户${idx+1}打卡报名成功`)
    } else {
        console.log(`用户${idx+1}打卡报名失败：${result.msg}`)
    }
}

//早起打卡
async function DoCard(idx) {
    let caller = printCaller()
    let reqCk = userCookieArr[idx].replace(/zqkey/g,'cookie')
    let url = 'https://kd.youth.cn/WebApi/PunchCard/doCard?' + userCookieArr[idx]
    let body = ''
    let urlObject = populatePostUrl(url,body)
    urlObject['headers']['Referer'] = 'https://kd.youth.cn/h5/20190603cardactive/?' + reqCk
    await httpPost(urlObject,caller)
    let result = httpResult;
    if(!result) return
    
    if(result.code == 1) {
        console.log(`用户${idx+1}打卡成功，打卡时间：${result.data.date} ${result.data.card_time}`)
    } else {
        console.log(`用户${idx+1}打卡失败：${result.msg}`)
    }
}

//连续打卡抽奖
async function Luckdraw(idx) {
    let caller = printCaller()
    let reqCk = userCookieArr[idx].replace(/zqkey/g,'cookie')
    let url = 'https://kd.youth.cn/WebApi/PunchCard/luckdraw?' + userCookieArr[idx]
    let body = ''
    let urlObject = populatePostUrl(url,body)
    urlObject['headers']['Referer'] = 'https://kd.youth.cn/h5/20190603cardactive/?' + reqCk
    await httpPost(urlObject,caller)
    let result = httpResult;
    if(!result) return
    
    if(result.code == 1) {
        console.log(`用户${idx+1}连续打卡抽奖获得：${result.data.score}金币`)
    } else {
        console.log(`用户${idx+1}连续打卡抽奖失败：${result.msg}`)
    }
}

//并发抽奖
async function RunUserQueryRotary() {
    console.log(`\n查询用户轮盘抽奖次数`)
    for(userIdx=0; userIdx<userCookieArr.length; userIdx++) {
        QueryRotaryTable(userIdx)
        await $.wait(60)
    }
    await $.wait(1000)
    
    if(maxRotaryNum>0) {
        for(let i=0; i<maxRotaryNum; i++) {
            console.log(`\n==== 开始第${i+1}次轮盘抽奖 ====`)
            for(userIdx=0; userIdx<userCookieArr.length; userIdx++) {
                if(i < rotaryNum[userIdx]) {
                    TurnRotary(userIdx)
                    await $.wait(60)
                }
            }
            await $.wait(Math.floor(Math.random()*1000)+2000)
        }
    }
    
    if(maxBoxNum>0) {
        for(let i=0; i<maxBoxNum; i++) {
            let randomTime = Math.floor(Math.random()*3000)+32000
            console.log(`\n随机延迟 ${randomTime/1000}秒看视频开抽奖宝箱...`)
            await $.wait(randomTime)
            for(userIdx=0; userIdx<userCookieArr.length; userIdx++) {
                if(i < rotaryBoxList[userIdx].length) {
                    ChestReward(rotaryBoxList[userIdx][i],userIdx)
                    await $.wait(60)
                }
            }
        }
    }
}

//抽奖状态查询
async function QueryRotaryTable(idx) {
    rndtime = Math.floor(new Date().getTime())
    let caller = printCaller()
    let reqCk = userCookieArr[idx].replace(/zqkey/g,'cookie')
    let url = 'https://kd.youth.cn/WebApi/RotaryTable/getData?_='+rndtime
    let urlObject = populatePostUrl(url,reqCk)
    urlObject.headers['host'] = 'kd.youth.cn'
    urlObject.headers['Referer'] = refRotory + reqCk
    await httpPost(urlObject,caller)
    let result = httpResult;
    if(!result) return
    
    if(result.status == 1) {
        console.log(`用户${idx+1}当前已抽奖：${result.data.opened}次，剩余抽奖次数：${result.data.remainTurn}次`)
        rotaryNum[idx] = result.data.remainTurn > rotaryStep ? rotaryStep : result.data.remainTurn
        rotaryBoxList[idx] = []
        let numOpen = result.data.opened + rotaryNum[idx]
        if(Array.isArray(result.data.chestOpen)) {
            let chestOpen = result.data.chestOpen
            for(let i=0; i<chestOpen.length; i++) {
                if(chestOpen[i].received == 0 && numOpen >= chestOpen[i].times) rotaryBoxList[idx].push(i+1)
            }
        }
        maxRotaryNum = getMax(maxRotaryNum,rotaryNum[idx])
        maxBoxNum = getMax(maxBoxNum,rotaryBoxList[idx].length)
    } else {
        console.log(`用户${idx+1}抽奖次数查询失败：${result.msg}`)
    }
}

//抽奖宝箱
async function ChestReward(idx,uIdx) {
    rndtime = Math.floor(new Date().getTime())
    let caller = printCaller()
    let url = 'https://kd.youth.cn/WebApi/RotaryTable/chestReward?_='+rndtime
    let reqCk = userCookieArr[uIdx].replace(/zqkey/g,'cookie')
    let reqBody = reqCk + '&num=' + idx
    let urlObject = populatePostUrl(url,reqBody)
    urlObject.headers['host'] = 'kd.youth.cn'
    urlObject.headers['Referer'] = refRotory + reqCk
    await httpPost(urlObject,caller)
    let result = httpResult;
    if(!result) return
    
    if(result.status == 1) {
        console.log(`用户${uIdx+1}开抽奖第${idx}个宝箱获得${result.data.score}金币`)
    } else {
        console.log(`用户${uIdx+1}开抽奖宝箱失败：${result.msg}`)
    }
}

//抽奖
async function TurnRotary(idx) {
    rndtime = Math.floor(new Date().getTime())
    let caller = printCaller()
    let url = 'https://kd.youth.cn/WebApi/RotaryTable/turnRotary?_='+rndtime
    let reqCk = userCookieArr[idx].replace(/zqkey/g,'cookie')
    let urlObject = populatePostUrl(url,reqCk)
    urlObject.headers['host'] = 'kd.youth.cn'
    urlObject.headers['Referer'] = refRotory + reqCk
    await httpPost(urlObject,caller)
    let result = httpResult;
    if(!result) return
    
    if(result.status == 1) {
        console.log(`用户${idx+1}抽奖获得${result.data.score}金币，剩余抽奖次数${result.data.remainTurn}`)
    } else {
        console.log(`用户${idx+1}抽奖失败：${result.msg}`)
    }
}

//并发转发
async function RunUserHotShare() {
    let curTime = new Date()
    let currentHour = curTime.getHours()
    action = ''
    if(currentHour>=5 && currentHour<10) {
        action = 'beread_extra_reward_one'
    } else if(currentHour>=11 && currentHour<16) {
        action = 'beread_extra_reward_two'
    } else if(currentHour>=17 && currentHour<22) {
        action = 'beread_extra_reward_three'
    }
    
    console.log(`\n查询用户转发状态`)
    for(userIdx=0; userIdx<userCookieArr.length; userIdx++) {
        QueryShareStatus(userIdx)
        await $.wait(60)
    }
    await $.wait(1000)
    
    if(boxFlag==1) {
        console.log(`\n准备领取转发页面定时宝箱`)
        for(userIdx=0; userIdx<userCookieArr.length; userIdx++) {
            if(shareBoxFlag[userIdx]==1) {
                GetRewardShareBox(userIdx)
                await $.wait(60)
            }
        }
        await $.wait(1000)
    }
    
    if(shareFlag==1) {
        console.log(`\n准备做转发任务`)
        for(userIdx=0; userIdx<userCookieArr.length; userIdx++) {
            if(shareAction[userIdx]) {
                ListsNewTag(userIdx)
                await $.wait(60)
            }
        }
        await $.wait(1000)
        console.log(`\n准备领转发时段奖励`)
        for(userIdx=0; userIdx<userCookieArr.length; userIdx++) {
            if(shareAction[userIdx]) {
                ExecExtractTask(action,shareAction[userIdx],userIdx)
                await $.wait(60)
            }
        }
    }
}

//时段转发以及转发页面红包冷却查询 -- 30分钟一次
async function QueryShareStatus(idx) {
    let caller = printCaller()
    let url = 'http://kd.youth.cn/WebApi/ShareNew/bereadExtraList'
    let reqCk = userCookieArr[idx].replace(/zqkey/g,'cookie')
    let urlObject = populatePostUrl(url,reqCk)
    urlObject.headers['host'] = 'kd.youth.cn'
    urlObject.headers['Referer'] = refHotShare + reqCk
    await httpPost(urlObject,caller)
    let result = httpResult;
    if(!result) return
    
    if(result.code == 200) {
        if(result.data && result.data.taskList && Array.isArray(result.data.taskList)) {
            let taskList = result.data.taskList
            for(let i=0; i<taskList.length; i++) {
                let taskItem = taskList[i]
                if(taskItem.action.indexOf('time_packet_reward') > -1) {
                    if(taskItem.status == 1) {
                        shareBoxFlag[idx] = 1
                        console.log(`用户${idx+1}转发页面定时宝箱可以领取`)
                    } else {
                        shareBoxFlag[idx] = 0
                        let cdTime = taskItem.total_time - taskItem.countdown
                        console.log(`用户${idx+1}转发页面定时宝箱冷却时间：${cdTime}秒`)
                    }
                }
                if(action && taskItem.action.indexOf(action) > -1) {
                    if(taskItem.status == 0) {
                        shareAction[idx] = taskItem.name
                        console.log(`用户${idx+1}未完成${taskItem.name}任务`)
                    } else {
                        shareAction[idx] = ''
                        console.log(`用户${idx+1}已完成${taskItem.name}任务`)
                    }
                }
            }
        }
        if(shareBoxFlag[idx]) boxFlag = 1
        if(shareAction[idx]) shareFlag = 1
    } else {
        console.log(`\n转发页面查询失败：${result.msg}`)
    }
}

//转发页面红包领取 -- 30分钟一次
async function GetRewardShareBox(idx) {
    let caller = printCaller()
    let url = 'http://kd.youth.cn/WebApi/TimePacket/getReward'
    let reqCk = userCookieArr[idx].replace(/zqkey/g,'cookie')
    let urlObject = populatePostUrl(url,reqCk)
    urlObject.headers['host'] = 'kd.youth.cn'
    urlObject.headers['Referer'] = refHotShare + reqCk
    await httpPost(urlObject,caller)
    let result = httpResult;
    if(!result) return
    
    if(result.code == 1) {
        console.log(`用户${idx+1}领取转发页面定时宝箱成功：获得${result.data.score}金币`)
    } else {
        console.log(`用户${idx+1}领取转发页面定时宝箱失败：${result.msg}`)
    }
}

//转发页面列表
async function ListsNewTag(idx) {
    let caller = printCaller()
    let url = 'http://kd.youth.cn/WebApi/ArticleTop/listsNewTag'
    let reqCk = userCookieArr[idx].replace(/zqkey/g,'cookie')
    let urlObject = populatePostUrl(url,reqCk)
    urlObject.headers['host'] = 'kd.youth.cn'
    urlObject.headers['Referer'] = refHotShare + reqCk
    await httpPost(urlObject,caller)
    let result = httpResult;
    if(!result) return
    
    if(result.status == 1) {
        if(result.data && result.data.items && Array.isArray(result.data.items) && result.data.items.length > 0) {
            let shareIdx = Math.floor(Math.random()*result.data.items.length)
            let newsItem = result.data.items[shareIdx]
            GetShareArticleReward(newsItem.id,idx)
        }
    } else {
        console.log(`用户${idx+1}查询转发页面列表失败：${result.msg}`)
    }
}

//转发文章
async function GetShareArticleReward(articleId,idx) {
    let caller = printCaller()
    let url = 'http://kd.youth.cn/WebApi/ShareNew/getShareArticleReward'
    let reqBody = userCookieArr[idx] + '&article_id=' + articleId
    let reqCk = userCookieArr[idx].replace(/zqkey/g,'cookie')
    let urlObject = populatePostUrl(url,reqBody)
    urlObject.headers['host'] = 'kd.youth.cn'
    urlObject.headers['Referer'] = refHotShare + reqCk
    await httpPost(urlObject,caller)
    let result = httpResult;
    if(!result) return
    
    if(result.status == 1) {
        if(result.data.share == 1) {
            console.log(`用户${idx+1}转发文章成功`)
        }
    } else {
        console.log(`用户${idx+1}转发文章失败：${result.msg}`)
    }
}

//转发时段奖励
async function ExecExtractTask(action,name,idx) {
    let caller = printCaller()
    let url = 'http://kd.youth.cn/WebApi/ShareNew/execExtractTask'
    let reqBody = userCookieArr[idx] + '&action=' + action
    let reqCk = userCookieArr[idx].replace(/zqkey/g,'cookie')
    let urlObject = populatePostUrl(url,reqBody)
    urlObject.headers['host'] = 'kd.youth.cn'
    urlObject.headers['Referer'] = refHotShare + reqCk
    await httpPost(urlObject,caller)
    let result = httpResult;
    if(!result) return
    
    if(result.code == 200) {
        console.log(`用户${idx+1}领取${name}转发奖励成功`)
    } else {
        console.log(`用户${idx+1}领取${name}转发奖励失败：${result.msg}`)
    }
}

//并发刷福利视频
async function RunVideo() {
    console.log(`\n查询用户福利视频完成次数`)
    for(userIdx=0; userIdx<userCookieArr.length; userIdx++) {
        GetTaskList(userIdx)
        await $.wait(60)
    }
    await $.wait(1000)
    
    if(needVideo==1) {
        console.log(`\n准备刷福利视频`)
        for(userIdx=0; userIdx<userCookieArr.length; userIdx++) {
            if(videoFlag[userIdx]==1) {
                recordVideoNum(userIdx)
                await $.wait(60)
            }
        }
    }
}

//查询任务进度
async function GetTaskList(idx) {
    let caller = printCaller()
    let url = 'https://kandian.wkandian.com/v17/NewTask/getTaskList.json?app_version=3.9.8&' + userCookieArr[idx]
    let urlObject = populateGetUrl(url)
    await httpGet(urlObject,caller)
    let result = httpResult;
    if(!result) return
    
    if(result.success == true) {
        for(let dailyItem of result.items.daily) {
            if(dailyItem.id == 10) {
                if(dailyItem.title_num < dailyItem.title_total) {
                    console.log(`用户${idx+1}未完成全部福利视频，已看${dailyItem.title_num}次`)
                    videoFlag[idx] = 1
                } else {
                    console.log(`用户${idx+1}已完成全部福利视频`)
                    videoFlag[idx] = 0
                }
            }
        }
        if(videoFlag[idx]==1) needVideo = 1
    } else {
        console.log(`用户${idx+1}查询任务进度失败：${result.msg}`)
    }
}

//刷福利视频
async function recordVideoNum(idx) {
    let caller = printCaller()
    let url = 'https://kandian.wkandian.com/V17/NewTask/recordNum.json?' + userCookieArr[idx]
    let urlObject = populateGetUrl(url)
    await httpGet(urlObject,caller)
    let result = httpResult;
    if(!result) return
    
    if(result.success == true) {
        console.log(`用户${idx+1}看福利视频成功`)
    } else {
        console.log(`用户${idx+1}看福利视频失败：${result.msg}`)
    }
}
////////////////////////////////////////////////////////////////////
function populatePostUrl(url,reqBody){
    let rndtime = Math.floor(new Date().getTime()/1000)
    let urlObject = {
        url: url,
        headers: {
            'request_time' : rndtime,
            'Host' : 'kandian.wkandian.com',
            'device-model' : 'VOG-AL10',
            'device-platform' : 'android',
            'Connection' : 'keep-alive',
        },
        body: reqBody
    }
    return urlObject;
}

function populateGetUrl(url){
    let rndtime = Math.floor(new Date().getTime()/1000)
    let urlObject = {
        url: url,
        headers: {
            'request_time' : rndtime,
            'Host' : 'kandian.wkandian.com',
            'device-model' : 'VOG-AL10',
            'device-platform' : 'android',
            'Connection' : 'keep-alive',
        }
    }
    return urlObject;
}

async function httpPost(url,caller) {
    httpResult = null
    return new Promise((resolve) => {
        $.post(url, async (err, resp, data) => {
            try {
                if (err) {
                    console.log(caller + ": post请求失败");
                    console.log(JSON.stringify(err));
                    $.logErr(err);
                } else {
                    if (safeGet(data)) {
                        httpResult = JSON.parse(data);
                        if(logDebug) console.log(httpResult);
                    }
                }
            } catch (e) {
                $.logErr(e, resp);
            } finally {
                resolve();
            }
        });
    });
}

async function httpGet(url,caller) {
    httpResult = null
    return new Promise((resolve) => {
        $.get(url, async (err, resp, data) => {
            try {
                if (err) {
                    console.log(caller + ": get请求失败");
                    console.log(JSON.stringify(err));
                    $.logErr(err);
                } else {
                    if (safeGet(data,caller)) {
                        httpResult = JSON.parse(data);
                        if(logDebug) console.log(httpResult);
                    }
                }
            } catch (e) {
                $.logErr(e, resp);
            } finally {
                resolve();
            }
        });
    });
}

function safeGet(data,caller) {
    try {
        if (typeof JSON.parse(data) == "object") {
            return true;
        } else {
            console.log(`Function ${caller}: 未知错误`);
            console.log(data)
        }
    } catch (e) {
        console.log(e);
        console.log(`Function ${caller}: 服务器访问数据为空，请检查自身设备网络情况`);
        return false;
    }
}

function printCaller(){
    return (new Error()).stack.split("\n")[2].trim().split(" ")[1]
}

function getMin(a,b){
    return ((a<b) ? a : b)
}

function getMax(a,b){
    return ((a<b) ? b : a)
}

function EncFunc(message) {
    var keyHex = CryptoJS.enc.Utf8.parse(key);
    var ivHex = CryptoJS.enc.Utf8.parse(key);
    var word = CryptoJS.enc.Utf8.parse(message);
    encrypted = CryptoJS.DES.encrypt(
        word, 
        keyHex, 
        {iv:ivHex, mode:CryptoJS.mode.CBC, padding:CryptoJS.pad.Pkcs7}
    );
return encrypted.ciphertext.toString();
}

function DecFunc(message) {
    var keyHex = CryptoJS.enc.Utf8.parse(key);
    var ivHex = CryptoJS.enc.Utf8.parse(key);
    // direct decrypt ciphertext
    var decrypted = CryptoJS.DES.decrypt(
        {ciphertext: CryptoJS.enc.Base64.parse(message)}, 
        keyHex, 
        {iv:ivHex, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7}
    );
    return decrypted.toString(CryptoJS.enc.Utf8);
}

function randomString(len=12) {
    let chars = 'qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM';
    let maxLen = chars.length;
    let str = '';
    for (i = 0; i < len; i++) {
        str += chars.charAt(Math.floor(Math.random()*maxLen));
    }
    return str;
}

function Env(t, e) { class s { constructor(t) { this.env = t } send(t, e = "GET") { t = "string" == typeof t ? { url: t } : t; let s = this.get; return "POST" === e && (s = this.post), new Promise((e, i) => { s.call(this, t, (t, s, r) => { t ? i(t) : e(s) }) }) } get(t) { return this.send.call(this.env, t) } post(t) { return this.send.call(this.env, t, "POST") } } return new class { constructor(t, e) { this.name = t, this.http = new s(this), this.data = null, this.dataFile = "box.dat", this.logs = [], this.isMute = !1, this.isNeedRewrite = !1, this.logSeparator = "\n", this.startTime = (new Date).getTime(), Object.assign(this, e), this.log("", `\ud83d\udd14${this.name}, \u5f00\u59cb!`) } isNode() { return "undefined" != typeof module && !!module.exports } isQuanX() { return "undefined" != typeof $task } isSurge() { return "undefined" != typeof $httpClient && "undefined" == typeof $loon } isLoon() { return "undefined" != typeof $loon } toObj(t, e = null) { try { return JSON.parse(t) } catch { return e } } toStr(t, e = null) { try { return JSON.stringify(t) } catch { return e } } getjson(t, e) { let s = e; const i = this.getdata(t); if (i) try { s = JSON.parse(this.getdata(t)) } catch { } return s } setjson(t, e) { try { return this.setdata(JSON.stringify(t), e) } catch { return !1 } } getScript(t) { return new Promise(e => { this.get({ url: t }, (t, s, i) => e(i)) }) } runScript(t, e) { return new Promise(s => { let i = this.getdata("@chavy_boxjs_userCfgs.httpapi"); i = i ? i.replace(/\n/g, "").trim() : i; let r = this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout"); r = r ? 1 * r : 20, r = e && e.timeout ? e.timeout : r; const [o, h] = i.split("@"), a = { url: `http://${h}/v1/scripting/evaluate`, body: { script_text: t, mock_type: "cron", timeout: r }, headers: { "X-Key": o, Accept: "*/*" } }; this.post(a, (t, e, i) => s(i)) }).catch(t => this.logErr(t)) } loaddata() { if (!this.isNode()) return {}; { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e); if (!s && !i) return {}; { const i = s ? t : e; try { return JSON.parse(this.fs.readFileSync(i)) } catch (t) { return {} } } } } writedata() { if (this.isNode()) { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e), r = JSON.stringify(this.data); s ? this.fs.writeFileSync(t, r) : i ? this.fs.writeFileSync(e, r) : this.fs.writeFileSync(t, r) } } lodash_get(t, e, s) { const i = e.replace(/\[(\d+)\]/g, ".$1").split("."); let r = t; for (const t of i) if (r = Object(r)[t], void 0 === r) return s; return r } lodash_set(t, e, s) { return Object(t) !== t ? t : (Array.isArray(e) || (e = e.toString().match(/[^.[\]]+/g) || []), e.slice(0, -1).reduce((t, s, i) => Object(t[s]) === t[s] ? t[s] : t[s] = Math.abs(e[i + 1]) >> 0 == +e[i + 1] ? [] : {}, t)[e[e.length - 1]] = s, t) } getdata(t) { let e = this.getval(t); if (/^@/.test(t)) { const [, s, i] = /^@(.*?)\.(.*?)$/.exec(t), r = s ? this.getval(s) : ""; if (r) try { const t = JSON.parse(r); e = t ? this.lodash_get(t, i, "") : e } catch (t) { e = "" } } return e } setdata(t, e) { let s = !1; if (/^@/.test(e)) { const [, i, r] = /^@(.*?)\.(.*?)$/.exec(e), o = this.getval(i), h = i ? "null" === o ? null : o || "{}" : "{}"; try { const e = JSON.parse(h); this.lodash_set(e, r, t), s = this.setval(JSON.stringify(e), i) } catch (e) { const o = {}; this.lodash_set(o, r, t), s = this.setval(JSON.stringify(o), i) } } else s = this.setval(t, e); return s } getval(t) { return this.isSurge() || this.isLoon() ? $persistentStore.read(t) : this.isQuanX() ? $prefs.valueForKey(t) : this.isNode() ? (this.data = this.loaddata(), this.data[t]) : this.data && this.data[t] || null } setval(t, e) { return this.isSurge() || this.isLoon() ? $persistentStore.write(t, e) : this.isQuanX() ? $prefs.setValueForKey(t, e) : this.isNode() ? (this.data = this.loaddata(), this.data[e] = t, this.writedata(), !0) : this.data && this.data[e] || null } initGotEnv(t) { this.got = this.got ? this.got : require("got"), this.cktough = this.cktough ? this.cktough : require("tough-cookie"), this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar, t && (t.headers = t.headers ? t.headers : {}, void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar)) } get(t, e = (() => { })) { t.headers && (delete t.headers["Content-Type"], delete t.headers["Content-Length"]), this.isSurge() || this.isLoon() ? (this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.get(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) })) : this.isQuanX() ? (this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t))) : this.isNode() && (this.initGotEnv(t), this.got(t).on("redirect", (t, e) => { try { if (t.headers["set-cookie"]) { const s = t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString(); this.ckjar.setCookieSync(s, null), e.cookieJar = this.ckjar } } catch (t) { this.logErr(t) } }).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) })) } post(t, e = (() => { })) { if (t.body && t.headers && !t.headers["Content-Type"] && (t.headers["Content-Type"] = "application/x-www-form-urlencoded"), t.headers && delete t.headers["Content-Length"], this.isSurge() || this.isLoon()) this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.post(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) }); else if (this.isQuanX()) t.method = "POST", this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t)); else if (this.isNode()) { this.initGotEnv(t); const { url: s, ...i } = t; this.got.post(s, i).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) }) } } time(t) { let e = { "M+": (new Date).getMonth() + 1, "d+": (new Date).getDate(), "H+": (new Date).getHours(), "m+": (new Date).getMinutes(), "s+": (new Date).getSeconds(), "q+": Math.floor(((new Date).getMonth() + 3) / 3), S: (new Date).getMilliseconds() }; /(y+)/.test(t) && (t = t.replace(RegExp.$1, ((new Date).getFullYear() + "").substr(4 - RegExp.$1.length))); for (let s in e) new RegExp("(" + s + ")").test(t) && (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? e[s] : ("00" + e[s]).substr(("" + e[s]).length))); return t } msg(e = t, s = "", i = "", r) { const o = t => { if (!t) return t; if ("string" == typeof t) return this.isLoon() ? t : this.isQuanX() ? { "open-url": t } : this.isSurge() ? { url: t } : void 0; if ("object" == typeof t) { if (this.isLoon()) { let e = t.openUrl || t.url || t["open-url"], s = t.mediaUrl || t["media-url"]; return { openUrl: e, mediaUrl: s } } if (this.isQuanX()) { let e = t["open-url"] || t.url || t.openUrl, s = t["media-url"] || t.mediaUrl; return { "open-url": e, "media-url": s } } if (this.isSurge()) { let e = t.url || t.openUrl || t["open-url"]; return { url: e } } } }; this.isMute || (this.isSurge() || this.isLoon() ? $notification.post(e, s, i, o(r)) : this.isQuanX() && $notify(e, s, i, o(r))); let h = ["", "==============\ud83d\udce3\u7cfb\u7edf\u901a\u77e5\ud83d\udce3=============="]; h.push(e), s && h.push(s), i && h.push(i), console.log(h.join("\n")), this.logs = this.logs.concat(h) } log(...t) { t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.join(this.logSeparator)) } logErr(t, e) { const s = !this.isSurge() && !this.isQuanX() && !this.isLoon(); s ? this.log("", `\u2757\ufe0f${this.name}, \u9519\u8bef!`, t.stack) : this.log("", `\u2757\ufe0f${this.name}, \u9519\u8bef!`, t) } wait(t) { return new Promise(e => setTimeout(e, t)) } done(t = {}) { const e = (new Date).getTime(), s = (e - this.startTime) / 1e3; this.log("", `\ud83d\udd14${this.name}, \u7ed3\u675f! \ud83d\udd5b ${s} \u79d2`), this.log(), (this.isSurge() || this.isQuanX() || this.isLoon()) && $done(t) } }(t, e) }
