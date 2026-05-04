const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

const SALT_ROUNDS = 10;

const rawUsers = [
  { firstName: "Somchai",    email: "somchai.k@fior.shop",     password: "FlowerLover1",   registeredAt: "2024-01-15T08:30:00Z" },
  { firstName: "Nattaya",    email: "nattaya.p@fior.shop",     password: "Rose@2024",      registeredAt: "2024-02-03T10:15:00Z" },
  { firstName: "Wanchai",    email: "wanchai.m@gmail.com",     password: "tulip99!",       registeredAt: "2024-03-22T14:45:00Z" },
  { firstName: "Pimchanok",  email: "pimchanok.r@fior.shop",   password: "PastelGarden#1", registeredAt: "2024-04-11T09:00:00Z" },
  { firstName: "Thanakorn",  email: "thanakorn.s@gmail.com",   password: "Lavend3r$",      registeredAt: "2024-05-07T16:20:00Z" },
  { firstName: "Siriporn",   email: "siriporn.t@fior.shop",    password: "Bouquet2024",    registeredAt: "2024-06-19T11:10:00Z" },
  { firstName: "Kittipong",  email: "kittipong.c@hotmail.com", password: "kitti@fior1",    registeredAt: "2024-07-30T08:55:00Z" },
  { firstName: "Arunee",     email: "arunee.w@fior.shop",      password: "SunFlower!7",    registeredAt: "2024-08-14T13:40:00Z" },
  { firstName: "Natthapong", email: "natthapong.l@gmail.com",  password: "Orchid#99",      registeredAt: "2024-09-25T17:05:00Z" },
  { firstName: "Chonlada",   email: "chonlada.n@fior.shop",    password: "WhiteBloom0!",   registeredAt: "2024-10-08T07:30:00Z" }
];

async function generate() {
  // Hash every password with bcrypt
  const users = await Promise.all(
    rawUsers.map(async (u, i) => ({
      id: i + 1,
      firstName: u.firstName,
      username: u.email,
      passwordHash: await bcrypt.hash(u.password, SALT_ROUNDS),
      registeredAt: u.registeredAt
    }))
  );

  // Plaintext credentials for login testing
  const credentials = rawUsers.map((u, i) => ({
    id: i + 1,
    email: u.email,
    plainPassword: u.password
  }));

  const outDir = path.join(__dirname);
  fs.writeFileSync(path.join(outDir, "users.json"),             JSON.stringify(users, null, 2));
  fs.writeFileSync(path.join(outDir, "login-credentials.json"), JSON.stringify(credentials, null, 2));

  console.log("users.json             -> created (" + users.length + " users, bcrypt hashed)");
  console.log("login-credentials.json -> created (" + credentials.length + " pairs)");
}

generate();
