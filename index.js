const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    handleSIGINT: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

var userSelection = [],
  where = {};

let p1 = "Product 1",
  p2 = "Product 2",
  p3 = "Product 3";

let chooseProducts = `Choose Product
1. ${p1}
2. ${p2}
3. ${p3}`;

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("Client is ready!");
});

client.on("message", async (msg) => {
  // console.log(userSelection, where);
  msg.body = msg.body.replace(/\s\s+/g, " ");
  if (typeof where[msg.from] == "number") {
    let s = userSelection[where[msg.from]];
    if (s.step == 1) step1(s, msg);
    else if (s.step == 2) step2(s, msg);
    else if (s.step == 3) step3(s, msg);
    else if (s.step == 100) step100(s, msg);
  } else {
    where[msg.from] =
      userSelection.push({
        step: 1,
        lastModify: new Date().getTime(),
        number: msg.from.slice(0, -5),
      }) - 1;
    client.sendMessage(msg.from, chooseProducts);
  }
});

setInterval(function () {
  let time = new Date().getTime();
  userSelection = userSelection.filter((c) => {
    if (time - c.lastModify > 100000) delete where[c.number + "@c.us"];
    return time - c.lastModify < 100000;
  });
}, 100000);

client.initialize();

function step1(s, msg) {
  let b = msg.body.trim();
  if (b == 1 || b == 2 || b == 3) {
    if (b == 1) s.product = p1;
    else if (b == 2) s.product = p2;
    else if (b == 3) s.product = p3;
    s.step = 2;
    client.sendMessage(msg.from, "Please enter your name.");
  } else
    client.sendMessage(
      msg.from,
      "Invalid selection please choose right option."
    );
  s.lastModify = new Date().getTime();
}
function step2(s, msg) {
  if (msg.body.trim().length > 3) {
    s.name = msg.body.trim();
    s.step = 3;
    client.sendMessage(msg.from, "Please enter your address.");
  } else {
    client.sendMessage(
      msg.from,
      "Name must contain more then 3 characters.\nPlease enter your name again."
    );
  }
  s.lastModify = new Date().getTime();
}
function step3(s, msg) {
  if (msg.body.trim().length > 10) {
    s.address = msg.body.trim();
    client.sendMessage(
      msg.from,
      "Please confirm your order." +
        "\n───────────────────────" +
        "\n*Product:* " +
        s.product +
        "\n\n*Name:* " +
        s.name +
        "\n\n*Phone Number:* " +
        s.number +
        "\n\n*Address:* " +
        s.address +
        "\n───────────────────────" +
        "\nEnter (Y/N) to proceed."
    );
    s.step = 100;
  } else {
    client.sendMessage(
      msg.from,
      "Address must contain more then 10 characters.\nPlease enter your address again."
    );
  }
  s.lastModify = new Date().getTime();
}
function step100(s, msg) {
  if (msg.body.trim().toLowerCase() == "y") {
    client.sendMessage(msg.from, "Order Placed.");
  } else if (msg.body.trim().toLowerCase() == "n") {
    client.sendMessage(msg.from, "Order canceled.");
  } else {
    client.sendMessage(
      msg.from,
      "Invalid selection please choose right option."
    );
    return;
  }
  userSelection.splice(where[msg.from], 1);
  delete where[msg.from];
}
