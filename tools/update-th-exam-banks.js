'use strict';
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const i18nDir = path.join(root, 'features', 'i18n');

// Update speaking-bank-th.json with exam items
const spThFile = path.join(i18nDir, 'speaking-bank-th.json');
const spTh = JSON.parse(fs.readFileSync(spThFile, 'utf8'));

const speakingExamTh = {
  speakx_0001: {
    instruction: "Part 1. ตอบคำถาม 4 ข้อนี้ทีละข้อ แต่ละข้อตอบ 2-3 ประโยค: Where do you live? Do you prefer studying in the morning or at night? How often do you use English outside class? What kind of music do you listen to?"
  },
  speakx_0002: {
    instruction: "Part 1. ตอบคำถาม 4 ข้อนี้ แต่ละข้อตอบ 2-3 ประโยค: Do you work or study? What do you enjoy most about it? Has your daily routine changed in the last year? Would you like to live in a different city?"
  },
  speakx_0003: {
    instruction: "Part 2. คุณมีเวลา 1 นาทีในการจดบันทึก แล้วพูด 1-2 นาที Describe a skill you learned that took a long time to get right. ต้องกล่าวถึงทั้ง 4 ประเด็นในการ์ด"
  },
  speakx_0004: {
    instruction: "Part 2. มีเวลา 1 นาทีในการเตรียมบันทึก แล้วพูด 1-2 นาที Describe a decision you made that other people disagreed with. ต้องกล่าวถึงทั้ง 4 ประเด็น รวมถึงประเด็นสุดท้าย"
  },
  speakx_0005: {
    instruction: "Part 3. การอภิปรายต่อเนื่องจากหัวข้อทักษะ ตอบคำถาม 3 ข้อนี้ แต่ละข้อตอบ 4-6 ประโยค: Why do some people give up on a skill halfway? Should schools teach practical skills as well as academic subjects? Is it easier to learn new skills as an adult than it used to be?"
  },
  speakx_0006: {
    instruction: "Part 3. การอภิปรายต่อเนื่องจากหัวข้อการตัดสินใจ ตอบคำถาม 3 ข้อนี้ แต่ละข้อตอบ 4-6 ประโยค: Are young people better at making independent decisions than older generations? How much should public opinion influence major government policies? Why do people find it difficult to admit they made a wrong decision?"
  },
  speakx_0007: {
    instruction: "Task 1 (Independent). เตรียม 15 วินาที พูด 45 วินาที Some people prefer living in places that have the same weather all year round, while others prefer living in places with distinct seasons. Which do you prefer and why?"
  },
  speakx_0008: {
    instruction: "Task 1 (Independent). เตรียม 15 วินาที พูด 45 วินาที Do you agree or disagree that students learn more from doing group assignments than from studying alone? Use specific reasons and examples to support your opinion."
  },
  speakx_0009: {
    instruction: "Task 2 (Campus, ดัดแปลงข้อความ). อ่านประกาศของมหาวิทยาลัยและบทสนทนา แล้วสรุปความคิดเห็นของนักเรียนชายและเหตุผลของเขา",
    sourceNote: "การดัดแปลง: ต้นฉบับเป็นการอ่านประกาศแล้วฟังเสียงบทสนทนา ที่นี่แสดงบทสนทนาเป็นข้อความ ให้อธิบายความคิดเห็นของผู้พูดและเหตุผล"
  },
  speakx_0010: {
    instruction: "Task 2 (Campus, ดัดแปลงข้อความ). อ่านข้อเสนอของมหาวิทยาลัยและบทสนทนา แล้วสรุปความคิดเห็นของนักเรียนหญิงและเหตุผลของเธอ",
    sourceNote: "การดัดแปลง: ต้นฉบับเป็นการอ่านประกาศแล้วฟังเสียงบทสนทนา ที่นี่แสดงบทสนทนาเป็นข้อความ ให้อธิบายความคิดเห็นของผู้พูดและเหตุผล"
  },
  speakx_0011: {
    instruction: "Task 3 (วิชาการ, ดัดแปลงข้อความ). อ่านนิยามและบทบรรยาย แล้วอธิบายว่าแนวคิดนี้ทำงานอย่างไรโดยใช้ตัวอย่างจากการบรรยาย",
    sourceNote: "การดัดแปลง: ต้นฉบับเป็นการอ่านนิยามแล้วฟังเสียงบรรยาย ที่นี่แสดงบทบรรยายเป็นข้อความ ให้อธิบายแนวคิดโดยใช้ตัวอย่างจากการบรรยาย"
  },
  speakx_0012: {
    instruction: "Task 3 (วิชาการ, ดัดแปลงข้อความ). อ่านข้อความและบทบรรยาย แล้วอธิบายแนวคิดโดยใช้ตัวอย่างจากบทบรรยาย",
    sourceNote: "การดัดแปลง: ต้นฉบับเป็นการอ่านนิยามแล้วฟังเสียงบรรยาย ที่นี่แสดงบทบรรยายเป็นข้อความ ให้อธิบายแนวคิดโดยใช้ตัวอย่างจากการบรรยาย"
  },
  speakx_0013: {
    instruction: "Task 4 (การบรรยาย, ดัดแปลงข้อความ). อ่านบทบรรยายแล้วสรุป 2 ประเด็นหลักพร้อมตัวอย่างของแต่ละประเด็น",
    sourceNote: "การดัดแปลง: ต้นฉบับเป็นการฟังเสียงบรรยายอย่างเดียว ที่นี่แสดงบทบรรยายเป็นข้อความ ให้อธิบาย 2 ประเด็นหลักพร้อมตัวอย่าง"
  },
  speakx_0014: {
    instruction: "Task 4 (การบรรยาย, ดัดแปลงข้อความ). อ่านบทบรรยายแล้วสรุป 2 ประเด็นหลักพร้อมตัวอย่างของแต่ละประเด็น",
    sourceNote: "การดัดแปลง: ต้นฉบับเป็นการฟังเสียงบรรยายอย่างเดียว ที่นี่แสดงบทบรรยายเป็นข้อความ ให้อธิบาย 2 ประเด็นหลักพร้อมตัวอย่าง"
  },
  speakx_0015: {
    instruction: "Part 2. มีเวลา 1 นาทีเตรียมบันทึก แล้วพูด 1-2 นาที Describe a time when you received constructive feedback that changed how you work. ต้องกล่าวถึงทั้ง 4 ประเด็น"
  },
  speakx_0016: {
    instruction: "Part 3. การอภิปรายเชิงลึกเรื่องการประเมินและการเรียนรู้ ตอบ 3 คำถาม แต่ละข้อ 4-6 ประโยค"
  },
  speakx_0017: {
    instruction: "Task 1 (Independent). เตรียม 15 วินาที พูด 45 วินาที Should universities require all students to complete internships before graduating?"
  }
};

Object.assign(spTh.items, speakingExamTh);
fs.writeFileSync(spThFile, JSON.stringify(spTh, null, 2) + '\n');
console.log('Updated speaking-bank-th.json with exam items. Total:', Object.keys(spTh.items).length);

// Update listening-bank-th.json with exam items
const lsThFile = path.join(i18nDir, 'listening-bank-th.json');
const lsTh = JSON.parse(fs.readFileSync(lsThFile, 'utf8'));

const listeningExamTh = {
  'lx-ielts-s1': { title: "การสมัครโปรแกรมว่ายน้ำ" },
  'lx-ielts-s2': { title: "การปรับปรุงสวนสาธารณะในเมือง" },
  'lx-ielts-s3': { title: "การอภิปรายโครงการพลังงานหมุนเวียน" },
  'lx-ielts-s4': { title: "การบรรยายเรื่องพฤติกรรมการอพยพของนก" },
  'lx-toefl-c1': { title: "การปรึกษาเรื่องการขยายเวลาส่งงานกับอาจารย์" },
  'lx-toefl-c2': { title: "การสอบถามเรื่องการเปลี่ยนหอพักในมหาวิทยาลัย" },
  'lx-toefl-l1': { title: "การบรรยายเรื่องผลกระทบของการเปลี่ยนแปลงสภาพภูมิอากาศต่อแนวปะการัง" },
  'lx-toefl-l2': { title: "การบรรยายเรื่องพัฒนาการของสถาปัตยกรรมโกธิก" }
};

Object.assign(lsTh.items, listeningExamTh);
lsTh.count = Object.keys(lsTh.items).length;
fs.writeFileSync(lsThFile, JSON.stringify(lsTh, null, 2) + '\n');
console.log('Updated listening-bank-th.json with exam sets. Total:', lsTh.count);
