const rewire = require("rewire");
const index = rewire("../index");
const putCsvRecordsIntoQuestionTable = index.__get__(
  "putCsvRecordsIntoQuestionTable"
);
const workinman_db = require("../workinman_db");
// @ponicode

const consoleLogSpy = jest.spyOn(console, "log");

describe("putCsvRecordsIntoQuestionTable", () => {
  test("0", async () => {
    let param1 = [
      {
        "Question ID": "2",
        "Question Text": "What is the capital of Honduras?",
        "Correct Answer": "Tegucigalpa",
        "Incorrect Answer 1": "Cohuatel",
        "Incorrect Answer 2": "Washington",
        "Incorrect Answer 3": "Toronto",
        "Difficulty Level": "2",
        "Image File Name": "Honduras.jpeg",
      },
      {
        "Question ID": "3",
        "Question Text": "What is the name of this food?",
        "Correct Answer": "Baleada",
        "Incorrect Answer 1": "Enchilada",
        "Incorrect Answer 2": "Buritto",
        "Incorrect Answer 3": "Taco",
        "Difficulty Level": "3",
        "Image File Name": "baleada.jpeg",
      },
      {
        "Question ID": "1",
        "Question Text": "What is the name of this character?",
        "Correct Answer": "Chavo de ocho?",
        "Incorrect Answer 1": "Don Carolos",
        "Incorrect Answer 2": "Manuel",
        "Incorrect Answer 3": "Nicolas",
        "Difficulty Level": "1",
        "Image File Name": "chavo.jpeg",
      },
    ];
    let result = await putCsvRecordsIntoQuestionTable(
      param1,
      "Bill@gmail.com",
      workinman_db.db
    );
    expect(consoleLogSpy).toBeCalled();
  });
});
