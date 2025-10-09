import { useCallback, useState } from "react";
import {
  Position,
  Handle,
  type Node,
  type NodeProps,
  useReactFlow,
  useNodeConnections,
  useNodesData,
} from "@xyflow/react";
import { GoogleGenAI } from "@google/genai";

function base64ToByteArray(base64String: string) {
  // Remove the data URL prefix if present (e.g., "data:image/png;base64,")
  const base64Data = base64String.split(",")[1] || base64String;

  // Decode base64 to binary string
  const binaryString = atob(base64Data);

  // Convert binary string to byte array
  const byteArray = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    byteArray[i] = binaryString.charCodeAt(i);
  }

  return byteArray;
}

function arrayToBase64(a: Uint8Array) {
  let binaryString = "";
  for (let i = 0; i < a.length; i++) {
    binaryString += String.fromCharCode(a[i]);
  }
  return btoa(binaryString);
}

function rawToBase64Mime(rawString: string, mimeType = "image/png") {
  // Convert Uint8Array to binary string

  const bString = atob(rawString);
  const uint8Array = new Uint8Array(bString.length);
  for (let i = 0; i < bString.length; i++) {
    uint8Array[i] = bString.charCodeAt(i);
  }

  let binaryString = "";
  for (let i = 0; i < uint8Array.length; i++) {
    binaryString += String.fromCharCode(uint8Array[i]);
  }

  // Encode to base64
  const base64 = btoa(binaryString);

  // Add MIME type prefix
  return `data:${mimeType};base64,${base64}`;
}

type AiNode = Node<
  { image: string; prompt: string; resultImage: string | null },
  "image"
>;

export const AiNode = ({ data, id }: NodeProps<AiNode>) => {
  const { updateNodeData } = useReactFlow();
  const c = useNodeConnections({ handleType: "target" });

  const [generating, setGenerating] = useState(false);

  const ai = new GoogleGenAI({
    apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
  });

  const images = useNodesData(c.map((c) => c.source))
    .filter((x) => x.data.image != null)
    .map((x) => x.data.image) as string[];

  const onGenerate = async () => {
    setGenerating(true);
    const bImages = [];

    for (const i of images) {
      const t = base64ToByteArray(i as string);

      bImages.push(t);
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [
        {
          text: data.prompt,
        },
        ...bImages.map((b) => {
          return {
            inlineData: {
              mimeType: "image/jpeg",
              data: arrayToBase64(b),
            },
          };
        }),
      ],
    });

    if (
      response.candidates &&
      response.candidates?.length > 0 &&
      response.candidates[0].content &&
      response.candidates[0].content.parts
    ) {
      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          console.log(part.text);
        } else if (part.inlineData) {
          const imageData = part.inlineData.data;

          const i = rawToBase64Mime(
            imageData as string,
            part.inlineData.mimeType
          );

          updateNodeData(id, { image: i });
        }
      }
    }

    setGenerating(false);
  };

  console.log(images);

  if (images.length == 0)
    return (
      <div className=" border rounded-md overflow-hidden bg-white p-2">
        <div>Waiting for previous node to have image</div>
        <Handle type="target" position={Position.Left} />
      </div>
    );

  return (
    <div className=" border rounded-md overflow-hidden bg-white">
      <div>
        {data.image ? (
          <img
            alt=""
            className="w-[200px] h-[200px] object-cover"
            src={data.image}
          />
        ) : generating ? (
          <div className="w-[200px] aspect-square animate-pulse bg-slate-400"></div>
        ) : (
          <div className="flex flex-col p-2 w-[200] aspect-square gap-1">
            <textarea
              className="grow outline-none resize-none"
              value={data.prompt || ""}
              placeholder="Enter prompt..."
              onChange={(e) => updateNodeData(id, { prompt: e.target.value })}
            />

            <button
              type="button"
              onClick={onGenerate}
              className="bg-slate-300 rounded-md"
              disabled={data.prompt.length == 0}
            >
              Generate
            </button>
          </div>
        )}
      </div>

      <Handle type="target" position={Position.Left} />
      {data.image ? <Handle type="source" position={Position.Right} /> : null}
    </div>
  );
};

type ImageNode = Node<{ image: string }, "image">;

export const ImageNode = ({ data, id }: NodeProps<ImageNode>) => {
  const { updateNodeData } = useReactFlow();

  const onChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (evt) => {
      const f = evt.target.files ? Array.from(evt.target.files) : null;

      if (f != null && f.length > 0) {
        const reader = new FileReader();

        reader.onloadend = () => {
          const base64String = reader.result;

          updateNodeData(id, { image: base64String });
        };

        reader.readAsDataURL(f[0]);
      }
    },
    [id, updateNodeData]
  );

  return (
    <div className="border rounded-md overflow-hidden bg-white shadow-2xl shadow-fuchsia-400  shadow">
      <div>
        {data.image ? (
          <img alt="preview" className="w-[200px]" src={data.image} />
        ) : (
          <label>
            <div className="p-2">Add image</div>
            <input
              id="text"
              name="text"
              type="file"
              onChange={onChange}
              className="nodrag hidden"
            />
          </label>
        )}
      </div>
      {data.image ? <Handle type="source" position={Position.Right} /> : null}
    </div>
  );
};
