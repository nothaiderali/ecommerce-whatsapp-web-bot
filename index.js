const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const { connectDB, dbclient } = require("./connect");

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    handleSIGINT: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

var userSelection = [],
  where = {};

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("Client is ready!");
});

client.on("message", async (msg) => {
  console.log(userSelection, where);
  msg.body = msg.body.replace(/\s\s+/g, " ");
  if (typeof where[msg.from] == "number") {
    let s = userSelection[where[msg.from]],
      b = msg.body.trim();
    if (b.slice(0, 1) == 0 && !b.includes(".") /*&& !(s.step == 1)*/) {
      _delete(s, msg);
      step0(msg);
    } else if (s.step == 1) step1(s, msg);
    else if (s.step == 2) step2(s, msg);
    else if (s.step == 3) step3(s, msg);
    else if (s.step == 4) step4(s, msg);
    else if (s.step == 100) step100(s, msg);
  } else step0(msg);
});

setInterval(function () {
  let time = new Date().getTime();
  userSelection = userSelection.filter((c) => {
    if (time - c.lastModify > 100000) delete where[c.number + "@c.us"];
    return time - c.lastModify < 100000;
  });
}, 100000);

client.initialize();

function check(b, size) {
  if (b.includes(".")) return false;
  if (b.slice(0, 1) == 0) return false;
  if (b <= size) return true;
  return undefined;
}

function _delete(s, msg) {
  try {
    userSelection.splice(where[msg.from], 1);
    delete where[msg.from];
  } catch (error) {}
}

async function step0(msg) {
  let db = await connectDB();
  let categories = await db
    .collection("categories")
    .find({}, { projection: { _id: 0 } })
    .toArray();
  await dbclient.close();
  where[msg.from] =
    userSelection.push({
      step: 1,
      lastModify: new Date().getTime(),
      number: msg.from.slice(0, -5),
      categories,
    }) - 1;
  let first = "Select Category";
  categories.map((c, i) => (first += "\n" + (i + 1) + ". " + c.n));
  client.sendMessage(msg.from, first);
}

async function step1(s, msg) {
  let b = msg.body.trim();
  if (check(b, s.categories.length)) {
    let db = await connectDB();
    s.products = await db
      .collection("products")
      .find({ c: s.categories[b - 1].id }, { projection: { _id: 0 } })
      .toArray();
    await dbclient.close();
    s.step = 2;
    let first = "Choose Product";
    s.products.map(
      (c, i) => (first += "\n" + (i + 1) + ". " + c.n + "\nPrice: Rs." + c.p)
    );
    client.sendMessage(msg.from, first);
  } else
    client.sendMessage(
      msg.from,
      "Invalid selection please choose right option.\nOr press 0 to start again."
    );
  s.lastModify = new Date().getTime();
}

function step2(s, msg) {
  let b = msg.body.trim();
  if (check(b, s.products.length)) {
    s.product = s.products[b - 1].n;
    s.price = s.products[b - 1].p;
    s.step = 3;
    client.sendMessage(msg.from, "Please enter your name.");
  } else
    client.sendMessage(
      msg.from,
      "Invalid selection please choose right option.\nOr press 0 to start again."
    );
  s.lastModify = new Date().getTime();
}
function step3(s, msg) {
  if (msg.body.trim().length > 3) {
    s.name = msg.body.trim();
    s.step = 4;
    client.sendMessage(msg.from, "Please enter your address.");
  } else {
    client.sendMessage(
      msg.from,
      "Name must contain more then 3 characters.\nPlease enter your name again.\nOr press 0 to start again."
    );
  }
  s.lastModify = new Date().getTime();
}
function step4(s, msg) {
  if (msg.body.trim().length > 10) {
    s.address = msg.body.trim();
    client.sendMessage(
      msg.from,
      "Please confirm your order." +
        "\n───────────────────────" +
        "\n*Name:* " +
        s.name +
        "\n\n*Phone Number:* " +
        s.number +
        "\n\n*Address:* " +
        s.address +
        "\n\n*Product:* " +
        s.product +
        "\n\n*Price:* Rs." +
        s.price +
        "\n───────────────────────" +
        "\nEnter (Y/N) to proceed.\nOr press 0 to start again."
    );
    s.step = 100;
  } else {
    client.sendMessage(
      msg.from,
      "Address must contain more then 10 characters.\nPlease enter your address again.\nOr press 0 to start again."
    );
  }
  s.lastModify = new Date().getTime();
}
async function step100(s, msg) {
  if (msg.body.trim().toLowerCase() == "y") {
    let date = new Date(s.lastModify)
      .toLocaleString("en-PK", {
        timeZone: "Etc/GMT-5",
      })
      .split(", ");
    let db = await connectDB();
    let result = await db.collection("orders").insertOne({
      Date: date[0],
      Time: date[1],
      Name: s.name,
      Phone: s.number,
      Address: s.address,
      Product: s.product,
      Price: s.price,
    });
    await dbclient.close();
    if (result.acknowledged == true)
      client.sendMessage(
        msg.from,
        "Thanks for placing order.\nYour Order ID: " + result.insertedId
      );
    else
      client.sendMessage(
        msg.from,
        "Internal Server Error. Please retry after some time."
      );
  } else if (msg.body.trim().toLowerCase() == "n") {
    client.sendMessage(msg.from, "Order canceled.");
  } else {
    client.sendMessage(
      msg.from,
      "Invalid selection please choose right option.\nOr press 0 to start again."
    );
    return;
  }
  _delete(s, msg);
}
