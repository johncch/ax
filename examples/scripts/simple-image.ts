import { config } from "dotenv";
import { Axle, Instruct } from "../../src/index.js";
import { getAxle } from "./helper.js";
config();

async function analyzeImage() {
  const imageFile = await Axle.loadFile(
    "./examples/data/economist-brainy-imports.png",
  );

  const instruct = Instruct.with(
    "What are the data that is shown in the image.",
    { description: "string" },
  );
  instruct.addImage(imageFile);

  const axle = getAxle();

  const result = await axle.execute(instruct);
  console.log(result);
  console.log(instruct.result.description);
}

analyzeImage();
