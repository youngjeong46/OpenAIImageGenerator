import Head from "next/head";
import { useState } from "react";
import styles from "./index.module.css";

export default function Home() {
  const [questionInput, setQuestionInput] = useState("");
  const [result, setResult] = useState();

  async function onSubmit(event) {
    event.preventDefault();
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question: questionInput }),
    });
    const data = await response.json();
    setResult(data.result);
  }

  return (
    <div>
      <Head>
        <title>ChatGPT Image Generator App</title>
        <link rel="icon" href="/dog.png" />
      </Head>

      <main className={styles.main}>
        <img src="/dog.png" className={styles.icon} />
        <h3>What would you like to see?</h3>
        <form onSubmit={onSubmit}>
          <textarea name="animal" value={questionInput} placeholder="Please describe a picture."
            onChange={(e) => setQuestionInput(e.target.value)} />
          <input type="submit" value="Generate a Picture" />
        </form>
        <div className={styles.result}><img src={result}></img></div>
      </main>
    </div>
  );
}
