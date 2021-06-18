const SteamUser = require('steam-user');
const SteamTotp = require('steam-totp');
const SteamCommunity = require('steamcommunity');
const TradeOfferManager = require('steam-tradeoffer-manager')
const config = require('./config.json');
process.env.TZ = 'Europe/Istanbul';
require('log-timestamp')(function() { return new Date().toString().slice(0,25)});
const client = new SteamUser();
const community = new SteamCommunity();
const manager = new TradeOfferManager({
        steam : client,
        community : community,
        language : 'en'
});
const groupMessage = `
Warnings
--------------
* Private inventory = Block
* Downgrade is possible if you give overpay.
* If you are looking for a profit with garbage items, don't waste my time.

[H]
- M4A1-S | Hyper Beast (Field-Tested)
- AK-47 | Bloodsport (Minimal Wear)
- StatTrak™ M4A4 | Evil Daimyo (Factory New)
- M4A1-S | Golden Coil (Battle-Scared)


[W]
- Only Good Offers.`;
const logOnOptions = {
    accountName : config.username,
    password : config.password,
    twoFactorCode : SteamTotp.generateAuthCode(config.sharedSecret),
    identityKey : SteamTotp.generateConfirmationKey(config.identitySecret)
};
let getArraySum =  function(items){
    var total = 0
    for(var i in items){
        if(items[i].appid == 730){
            total += Number(items[i].amount) * Number(items[i].est_usd);
        }
    }
    if(total == 0) console.log('Degeri 0 olan takas bulundu !');
    return total/100;
}

client.logOn(logOnOptions);
client.on('loggedOn',() => {
    console.log('Succesfully logged on.');
    client.setPersona(SteamUser.EPersonaState.Online);
    client.gamesPlayed(['RTE 2023',440]);
    console.log('Game Succesfully changed.')
});

client.on('friendMessage', (steamID,message) =>{
    if (message == 'merhaba'){
        client.chatMessage(steamID,'selam, naber ! ');
    }
});

client.on('webSession', (sessionid, cookies) => {
    manager.setCookies(cookies);
    community.setCookies(cookies);
    community.startConfirmationChecker(10000, config.identitySecret);
  });
//community.checkConfirmations();
manager.on('newOffer',(offer) => {
    if(offer.itemsToGive.length === 0){
        console.log('Yeni Hediye Geldi !');
        offer.accept((err,status) => {
            if(err) console.log('Teklifi onaylarken hata olustu !');
            else console.log(`Teklif kabul edildi. Durum : ${status}.`);
        });
    }
    else if(offer.partner.getSteamID64() === config.mySteamID){
        console.log('Teklifi mySteamID gonderdi ...');
        var sumGiveItemsUSD = getArraySum(offer.itemsToGive);
        var sumReceiveItemsUSD = getArraySum(offer.itemsToReceive);
        console.log(offer.itemsToReceive);
        console.log('Sum Gives:',sumGiveItemsUSD);
        console.log('Sum Receives:',sumReceiveItemsUSD);
        var overpay = sumReceiveItemsUSD - sumGiveItemsUSD;
        if(sumReceiveItemsUSD == 0){
            offer.decline((err,status) => {
                if(err) console.log('Teklifi reddederken hata olustu!');
                else console.log(`Teklif kabul edildi. Durum: ${status}.`);
            });
        }
        else if (overpay >= 1.0){
            offer.accept((err,status) => {
                if(err) console.log('Teklifi onaylarken hata olustu!');
                else console.log(`Teklif kabul edildi. Durum: ${status}.`);
            });
        }
        else{
            offer.decline((err,status) => {
                if(err) console.log('Teklifi reddederken hata olustu!');
                else console.log(`Teklif kabul edildi. Durum: ${status}.`);
            });
        }
        offer.accept((err,status) => {
            if(err) console.log('Teklifi onaylarken hata olustu!');
            else console.log(`Teklif kabul edildi. Durum: ${status}.`);
        })
    }
    else{
        console.log(`${offer.partner.getSteamID64()} ID'li kullanicidan teklif geldi.`);
    }
});

// Auto Comment
setInterval(() =>{
    
    for(var i = 0; i< config.steamGroups.length;i++){
        community.postGroupComment(config.steamGroups[i],groupMessage,(err) =>{
            if (err) console.log(err);
        });
    }
    console.log('Tum yorumlar atildi.');
}, 2*60*1000);