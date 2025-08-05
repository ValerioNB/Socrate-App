import React, { useState, useEffect, useRef } from "react";
import {
  Heart,
  Edit2,
  Save,
  MessageCircle,
  Send,
  User,
  Brain,
  Download,
  Copy,
  Check,
} from "lucide-react";

const SocrateApp = () => {
  const [activeTab, setActiveTab] = useState("trova");
  const [userMessage, setUserMessage] = useState("");
 const [conversation, setConversation] = useState<Message[]>([]);
  const [problems, setProblems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
const [socrateChat, setSocrateChat] = useState<SocrateMessage[]>([]);
  const [socrateInput, setSocrateInput] = useState("");
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [editingProblem, setEditingProblem] = useState(null);
  const [tempProblemText, setTempProblemText] = useState("");
  const [copied, setCopied] = useState(false);
  const [insights, setInsights] = useState([]);
  const [insightText, setInsightText] = useState("");
  const [showInsightInput, setShowInsightInput] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const socrateChatEndRef = useRef<HTMLDivElement | null>(null);

//edited da vale "secondo erorri con perplexity"
  type Message = {
  role: string;
  content: string;
  identified_problems?: string[];
  needs_more_exploration?: boolean;
};

type SocrateMessage = {
  role: string;
  content: string;
  dialogue_depth?: number;
  core_insight_reached?: boolean;
  final_reflection?: string;
  ask_for_insight?: boolean;
};


  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  useEffect(() => {
    socrateChatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [socrateChat]);

  // Funzione per chiamare l'API Gemini reale
  const callGeminiAPI = async (prompt: string) => {
    const response = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, model: "gemini-1.5-flash" }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();

    // Adattare se necessario in base alla risposta della tua API proxy
    return (
      data.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(data)
    );
  };

  const handleSendMessage = async () => {
    if (!userMessage.trim()) return;

    const newMessage = { role: "user", content: userMessage };
    const updatedConversation = [...conversation, newMessage];
    setConversation(updatedConversation);
    setUserMessage("");
    setIsLoading(true);

    try {
      const prompt = `
Agisci come un **Root Cause Analysis** esperto. Il tuo compito è aiutare l'utente a identificare i veri problemi alla radice delle sue difficoltà.

CONVERSAZIONE COMPLETA FINO AD ORA:
${JSON.stringify(updatedConversation)}

ISTRUZIONI SPECIFICHE:
1. Ascolta attentamente frasi-trappola emotive come:
   - "Ogni volta che mi metto lì, qualcosa mi blocca"
   - "Penso che sia colpa mia se..."
   - "So cosa dovrei fare, ma non riesco"
   - Altre espressioni di blocco emotivo o mentale

2. Fai domande mirate per scavare più a fondo nel problema reale
3. Non accontentarti della superficie - cerca la vera causa
4. Quando identifichi un problema specifico, formulalo in modo chiaro e preciso
5. Se l'utente ha più problemi, aiutalo a identificarli tutti

RISPONDI CON UN JSON che contenga:
{
  "response": "La tua risposta empatica e di supporto all'utente",
  "identified_problems": ["array di problemi identificati in questa conversazione, formulati in modo preciso"],
  "needs_more_exploration": true/false,
  "next_question": "Domanda specifica per approfondire, se needs_more_exploration è true"
}

IMPORTANTE: Il tuo tono deve essere empatico, non giudicante, ma incisivo nell'aiutare a scoprire i veri problemi. NON INCLUDERE BACKTICKS O ALTRO TESTO OLTRE AL JSON.
`;

      const response = await callGeminiAPI(prompt);

      let claudeResponse;
      try {
        const cleanResponse = response.replace(/``````\n?/g, "").trim();
        claudeResponse = JSON.parse(cleanResponse);
      } catch {
        // Se non è JSON, usa la risposta testuale
        claudeResponse = {
          response,
          identified_problems: [],
          needs_more_exploration: true,
          next_question: "Puoi dirmi di più su quello che senti?",
        };
      }

      setConversation((prev) => [
        ...prev,
        {
          role: "assistant",
          content: claudeResponse.response,
          identified_problems: claudeResponse.identified_problems || [],
          needs_more_exploration: claudeResponse.needs_more_exploration,
        },
      ]);

      // Aggiungi problemi identificati alla lista
      if (
        claudeResponse.identified_problems &&
        claudeResponse.identified_problems.length > 0
      ) {
        const newProblems = claudeResponse.identified_problems.map(
          (problem) => ({
            id: Date.now() + Math.random(),
            text: problem,
            status: "pending",
            createdAt: new Date().toISOString(),
          })
        );
        setProblems((prev) => [...prev, ...newProblems]);
      }
    } catch (error) {
      console.error("Errore nella comunicazione con Claude:", error);
      setConversation((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Mi dispiace, si è verificato un errore: ${error.message}. Verifica la tua API key e riprova.`,
          identified_problems: [],
          needs_more_exploration: false,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProblemEdit = (problem) => {
    setEditingProblem(problem.id);
    setTempProblemText(problem.text);
  };

  const handleProblemSave = (problemId) => {
    setProblems((prev) =>
      prev.map((p) =>
        p.id === problemId ? { ...p, text: tempProblemText } : p
      )
    );
    setEditingProblem(null);
    setTempProblemText("");
  };

  const handleProblemDelete = (problemId) => {
    setProblems((prev) => prev.filter((p) => p.id !== problemId));
  };

  const startSocrateChat = (problem) => {
    setSelectedProblem(problem);
    setActiveTab("socrate");
    setSocrateChat([
      {
        role: "socrate",
        content: `Mh... capisco. Ho letto attentamente il tuo problema: "${problem.text}". \n\nLo prendo sul serio. Non lo sminuisco. \n\nMa dimmi una cosa... **perché** per te questo è un problema?`,
      },
    ]);
  };

  const handleSocrateSend = async () => {
    if (!socrateInput.trim()) return;

    const newMessage = { role: "user", content: socrateInput };
    const updatedChat = [...socrateChat, newMessage];
    setSocrateChat(updatedChat);
    setSocrateInput("");
    setIsLoading(true);

    try {
      const prompt = `
Sei Socrate, il filosofo greco. Stai dialogando con una persona che ha questo problema: "${
        selectedProblem.text
      }"

CONVERSAZIONE COMPLETA:
${JSON.stringify(updatedChat)}

CARATTERISTICHE DEL TUO APPROCCIO:
- NON consoli. NON giudichi. NON dici cosa deve fare.
- Ti ascolti. Osservi. Poi fai domande precise, taglienti, gentili.
- Non serve a far stare meglio. Serve a far **pensare più a fondo**.
- Sei un fratello maggiore, un po' severo ma giusto.
- Credi talmente tanto nella persona da non lasciarla scappare.

STRUTTURA DEL DIALOGO - I 5 PERCHÉ:
1. Dopo ogni risposta, non ripeti meccanicamente "perché"
2. Ogni domanda è una cesellatura, non un colpo di martello
3. Esempi di transizioni:
   - "Interessante… e perché questo per te è così importante?"
   - "Hai mai pensato se dietro questo ci fosse qualcos'altro?"
   - "E se fosse solo una parte della verità?"
   - "Cosa succederebbe se non fosse così?"
   - "Chi ti ha insegnato a pensare in questo modo?"
   - "E se stessi solo proteggendo una parte di te?"

OBIETTIVO: Portare la persona alla radice del suo pensiero entro il 4°-5° scambio.
Spesso dietro il problema iniziale si nasconde una ferita, una paura, una credenza errata, un'abitudine protettiva.

IMPORTANTE - GESTIONE DEL QUINTO PERCHÉ:
- Se siamo al 5° scambio (dialogue_depth = 5), NON fare un'altra domanda
- Invece, riconosci che abbiamo raggiunto il cuore del problema
- Invita l'utente a scrivere la sua nuova consapevolezza in una frase
- Usa questo testo: "Invita l'utente a **scrivere la sua nuova consapevolezza** in una frase. Come fosse un diario segreto. Perché una verità capita… è una verità che resta."

RISPONDI CON UN JSON:
{
  "response": "La tua risposta socratica, una domanda penetrante ma gentile (se depth < 5) OPPURE l'invito a scrivere la consapevolezza (se depth = 5)",
  "dialogue_depth": numero_da_1_a_5,
  "core_insight_reached": true/false,
  "final_reflection": "se core_insight_reached è true, una frase finale di riflessione",
  "ask_for_insight": true/false (true se depth = 5)
}

IMPORTANTE: Parla come Socrate, in prima persona. Sii diretto ma rispettoso. NON INCLUDERE BACKTICKS O ALTRO TESTO OLTRE AL JSON.
`;

      const response = await callAnthropicAPI(prompt);
      let socrateResponse;

      try {
        const cleanResponse = response
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
        socrateResponse = JSON.parse(cleanResponse);
      } catch (parseError) {
        socrateResponse = {
          response: response,
          dialogue_depth: 1,
          core_insight_reached: false,
          ask_for_insight: false,
        };
      }

      setSocrateChat((prev) => [
        ...prev,
        {
          role: "socrate",
          content: socrateResponse.response,
          dialogue_depth: socrateResponse.dialogue_depth,
          core_insight_reached: socrateResponse.core_insight_reached,
          final_reflection: socrateResponse.final_reflection,
          ask_for_insight: socrateResponse.ask_for_insight,
        },
      ]);

      // Se Socrate chiede di scrivere la consapevolezza, mostra l'input
      if (socrateResponse.ask_for_insight) {
        setShowInsightInput(true);
      }
    } catch (error) {
      console.error("Errore nella comunicazione con Socrate:", error);
      setSocrateChat((prev) => [
        ...prev,
        {
          role: "socrate",
          content: `Mi dispiace, qualcosa è andato storto: ${error.message}`,
          dialogue_depth: 1,
          core_insight_reached: false,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveInsight = () => {
    if (!insightText.trim()) return;

    const newInsight = {
      id: Date.now(),
      text: insightText,
      problemId: selectedProblem.id,
      problemText: selectedProblem.text,
      createdAt: new Date().toISOString(),
    };

    setInsights((prev) => [...prev, newInsight]);
    setInsightText("");
    setShowInsightInput(false);

    // Aggiungi un messaggio di ringraziamento da Socrate
    setSocrateChat((prev) => [
      ...prev,
      {
        role: "socrate",
        content: `Perfetto. Ora che hai scritto la tua consapevolezza, è diventata parte di te. Ricorda: "La saggezza inizia nella meraviglia." \n\nSe vuoi, puoi continuare a parlare con me o riflettere su quello che hai scoperto.`,
        dialogue_depth: 6,
        core_insight_reached: true,
        final_reflection:
          "Una nuova consapevolezza è stata registrata nel tuo diario interiore.",
      },
    ]);
  };

  const handleKeyPress = (e, type) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (type === "trova") {
        handleSendMessage();
      } else if (type === "socrate") {
        handleSocrateSend();
      }
    }
  };

  const showDiary = () => {
    setActiveTab("diario");
  };

  const generateDiaryContent = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString("it-IT");
    const timeStr = now.toLocaleTimeString("it-IT");

    let content = `SOCRATE - DIARIO DI INTROSPEZIONE\n`;
    content += `Data: ${dateStr} - Ora: ${timeStr}\n`;
    content += `${"=".repeat(50)}\n\n`;

    // Sezione Problemi
    content += `📋 PROBLEMI IDENTIFICATI (${problems.length})\n`;
    content += `${"=".repeat(30)}\n\n`;

    if (problems.length === 0) {
      content += `Nessun problema identificato ancora.\n\n`;
    } else {
      problems.forEach((problem, index) => {
        content += `${index + 1}. ${problem.text}\n`;
        content += `   Status: ${problem.status}\n`;
        content += `   Creato: ${new Date(problem.createdAt).toLocaleString(
          "it-IT"
        )}\n\n`;
      });
    }

    // Sezione Conversazione Root Cause Analysis
    if (conversation.length > 0) {
      content += `💭 CONVERSAZIONE - TROVA IL PROBLEMA\n`;
      content += `${"=".repeat(40)}\n\n`;

      conversation.forEach((message, index) => {
        const speaker =
          message.role === "user" ? "TU" : "CLAUDE (Root Cause Analysis)";
        content += `[${speaker}]: ${message.content}\n`;

        if (
          message.identified_problems &&
          message.identified_problems.length > 0
        ) {
          content += `   → Problemi identificati: ${message.identified_problems.join(
            ", "
          )}\n`;
        }
        content += `\n`;
      });
    }

    // Sezione Dialogo con Socrate
    if (socrateChat.length > 0) {
      content += `🏛️ DIALOGO CON SOCRATE\n`;
      content += `${"=".repeat(25)}\n\n`;

      if (selectedProblem) {
        content += `Problema discusso: "${selectedProblem.text}"\n\n`;
      }

      socrateChat.forEach((message, index) => {
        const speaker = message.role === "user" ? "TU" : "SOCRATE";
        content += `[${speaker}]: ${message.content}\n`;

        if (message.final_reflection) {
          content += `   💡 RIFLESSIONE FINALE: ${message.final_reflection}\n`;
        }
        content += `\n`;
      });
    }

    // Sezione Consapevolezze
    if (insights.length > 0) {
      content += `✨ CONSAPEVOLEZZE RAGGIUNTE (${insights.length})\n`;
      content += `${"=".repeat(35)}\n\n`;

      insights.forEach((insight, index) => {
        content += `${index + 1}. "${insight.text}"\n`;
        content += `   Problema: ${insight.problemText}\n`;
        content += `   Data: ${new Date(insight.createdAt).toLocaleString(
          "it-IT"
        )}\n\n`;
      });
    }

    // Sezione finale
    content += `\n${"=".repeat(50)}\n`;
    content += `Fine del diario - Continua il tuo viaggio di conoscenza di te stesso.\n`;
    content += `"Una vita senza ricerca non è degna di essere vissuta" - Socrate\n`;

    return content;
  };

  const copyDiary = async () => {
    try {
      const diaryContent = generateDiaryContent();
      await navigator.clipboard.writeText(diaryContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Errore nel copiare il diario:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <h1 className="text-2xl font-bold text-gray-800">Socrate</h1>
            <div className="flex items-center space-x-4">
              <button
                onClick={showDiary}
                className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                title="Visualizza il tuo diario di introspezione"
              >
                <Download size={16} />
                <span className="text-sm font-medium">Visualizza Diario</span>
              </button>
              <div className="text-sm text-orange-600 font-medium">
                Conosci te stesso
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab("trova")}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === "trova"
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <div className="flex items-center space-x-2">
                <Brain size={16} />
                <span>Trova il tuo problema</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab("problemi")}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === "problemi"
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <div className="flex items-center space-x-2">
                <Heart size={16} />
                <span>I Problemi ({problems.length})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab("socrate")}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === "socrate"
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <div className="flex items-center space-x-2">
                <MessageCircle size={16} />
                <span>Parla con Socrate</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        {activeTab === "diario" && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-800">
                  Il tuo Diario di Introspezione
                </h2>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={copyDiary}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      copied
                        ? "bg-green-500 text-white"
                        : "bg-blue-500 text-white hover:bg-blue-600"
                    }`}
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    <span className="text-sm font-medium">
                      {copied ? "Copiato!" : "Copia Diario"}
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab("trova")}
                    className="flex items-center space-x-2 text-orange-500 hover:text-orange-700 transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                    <span className="text-sm">Torna alla Homepage</span>
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm text-gray-800 whitespace-pre-wrap max-h-96 overflow-y-auto">
                {generateDiaryContent()}
              </div>
            </div>
          </div>
        )}

        {activeTab === "trova" && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                Trova il tuo problema
              </h2>
              <p className="text-gray-600 mb-6">
                Racconta quello che senti. Io ti aiuterò a trovare il vero
                problema alla radice.
              </p>

              <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                {conversation.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.role === "user"
                          ? "bg-orange-500 text-white"
                          : "bg-gray-200 text-gray-800"
                      }`}
                    >
                      {message.content}
                      {message.identified_problems &&
                        message.identified_problems.length > 0 && (
                          <div className="mt-2 text-xs opacity-75">
                            ✓ {message.identified_problems.length} problema/i
                            identificato/i
                          </div>
                        )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg">
                      Sto riflettendo...
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="flex space-x-2">
                <input
                  type="text"
                  value={userMessage}
                  onChange={(e) => setUserMessage(e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, "trova")}
                  placeholder="Descrivi quello che senti, cosa ti blocca..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "problemi" && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                I tuoi problemi
              </h2>
              {problems.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Non hai ancora identificato nessun problema. Inizia dalla
                  sezione "Trova il tuo problema".
                </p>
              ) : (
                <div className="space-y-4">
                  {problems.map((problem) => (
                    <div
                      key={problem.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                    >
                      <div className="flex items-start space-x-3">
                        <Heart
                          className="text-orange-500 mt-1 flex-shrink-0"
                          size={16}
                        />
                        <div className="flex-1">
                          {editingProblem === problem.id ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={tempProblemText}
                                onChange={(e) =>
                                  setTempProblemText(e.target.value)
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                              />
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleProblemSave(problem.id)}
                                  className="px-3 py-1 bg-orange-500 text-white rounded text-sm hover:bg-orange-600"
                                >
                                  Salva
                                </button>
                                <button
                                  onClick={() => setEditingProblem(null)}
                                  className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                                >
                                  Annulla
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <p className="font-medium text-gray-800">
                                {problem.text}
                              </p>
                              <div className="flex items-center space-x-4 mt-2">
                                <button
                                  onClick={() => handleProblemEdit(problem)}
                                  className="text-orange-500 hover:text-orange-700 text-sm flex items-center space-x-1"
                                >
                                  <Edit2 size={14} />
                                  <span>Modifica</span>
                                </button>
                                <button
                                  onClick={() => startSocrateChat(problem)}
                                  className="text-gray-600 hover:text-gray-800 text-sm flex items-center space-x-1"
                                >
                                  <MessageCircle size={14} />
                                  <span>Parla con Socrate</span>
                                </button>
                                <button
                                  onClick={() =>
                                    handleProblemDelete(problem.id)
                                  }
                                  className="text-red-500 hover:text-red-700 text-sm"
                                >
                                  Elimina
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "socrate" && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                Dialogo con Socrate
              </h2>
              {selectedProblem && (
                <p className="text-gray-600 mb-6">
                  Problema: "{selectedProblem.text}"
                </p>
              )}

              <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                {socrateChat.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    Seleziona un problema dalla sezione "I Problemi" per
                    iniziare il dialogo con Socrate.
                  </div>
                ) : (
                  socrateChat.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${
                        message.role === "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                          message.role === "user"
                            ? "bg-orange-500 text-white"
                            : "bg-gray-200 text-gray-800"
                        }`}
                      >
                        {message.role === "socrate" && (
                          <div className="flex items-center space-x-2 mb-2">
                            <User size={16} className="text-gray-600" />
                            <span className="text-sm font-medium text-gray-600">
                              Socrate
                            </span>
                          </div>
                        )}
                        <div className="whitespace-pre-wrap">
                          {message.content}
                        </div>
                        {message.final_reflection && (
                          <div className="mt-2 p-2 bg-orange-50 rounded text-sm text-orange-800">
                            💡 {message.final_reflection}
                          </div>
                        )}
                        {message.ask_for_insight && (
                          <div className="mt-3 p-3 bg-blue-50 rounded text-sm text-blue-800 border border-blue-200">
                            <strong>
                              📝 È il momento di scrivere la tua
                              consapevolezza...
                            </strong>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-200 text-gray-800 px-4 py-3 rounded-lg">
                      Socrate sta riflettendo...
                    </div>
                  </div>
                )}
                <div ref={socrateChatEndRef} />
              </div>

              <div className="flex space-x-2">
                <input
                  type="text"
                  value={socrateInput}
                  onChange={(e) => setSocrateInput(e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, "socrate")}
                  placeholder="Rispondi a Socrate..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  disabled={!selectedProblem}
                />
                <button
                  onClick={handleSocrateSend}
                  disabled={isLoading || !selectedProblem}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                >
                  <Send size={16} />
                </button>
              </div>

              {/* Input per la consapevolezza */}
              {showInsightInput && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">
                    ✨ Scrivi la tua nuova consapevolezza
                  </h3>
                  <p className="text-sm text-blue-600 mb-3">
                    Come fosse un diario segreto. Perché una verità capita… è
                    una verità che resta.
                  </p>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={insightText}
                      onChange={(e) => setInsightText(e.target.value)}
                      placeholder="La mia consapevolezza è che..."
                      className="flex-1 px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleSaveInsight}
                      disabled={!insightText.trim()}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                    >
                      <Save size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SocrateApp;
