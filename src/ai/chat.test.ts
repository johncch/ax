import { describe, expect, test } from "@jest/globals";
import { Chat } from "./chat.js";
import { FileInfo } from "../utils/file.js";

describe("Chat", () => {
  describe("basic functionality", () => {
    test("addUser with string content", () => {
      const chat = new Chat();
      chat.addUser("Hello");
      
      expect(chat.messages).toHaveLength(1);
      expect(chat.messages[0].role).toBe("user");
      expect(chat.messages[0].content).toBe("Hello");
    });

    test("addSystem sets system message", () => {
      const chat = new Chat();
      chat.addSystem("You are a helpful assistant");
      
      expect(chat.system).toBe("You are a helpful assistant");
    });
  });

  describe("multimodal functionality", () => {
    const mockImageFile: FileInfo = {
      path: "/test/image.jpg",
      base64: "base64data",
      mimeType: "image/jpeg",
      size: 1000,
      name: "image.jpg",
      type: "image",
    };

    const mockPdfFile: FileInfo = {
      path: "/test/document.pdf",
      base64: "base64data",
      mimeType: "application/pdf",
      size: 2000,
      name: "document.pdf",
      type: "document",
    };

    test("addUserWithFiles with no files behaves like addUser", () => {
      const chat = new Chat();
      chat.addUserWithFiles("Hello", []);
      
      expect(chat.messages).toHaveLength(1);
      expect(chat.messages[0].role).toBe("user");
      expect(chat.messages[0].content).toBe("Hello");
    });

    test("addUserWithFiles with files creates multimodal content", () => {
      const chat = new Chat();
      chat.addUserWithFiles("Analyze this image", [mockImageFile]);
      
      expect(chat.messages).toHaveLength(1);
      expect(chat.messages[0].role).toBe("user");
      expect(Array.isArray(chat.messages[0].content)).toBe(true);
      
      const content = chat.messages[0].content as any[];
      expect(content).toHaveLength(2);
      expect(content[0].type).toBe("text");
      expect(content[0].text).toBe("Analyze this image");
      expect(content[1].type).toBe("file");
      expect(content[1].file).toBe(mockImageFile);
    });

    test("addUserWithFiles with multiple files", () => {
      const chat = new Chat();
      chat.addUserWithFiles("Analyze these files", [mockImageFile, mockPdfFile]);
      
      expect(chat.messages).toHaveLength(1);
      const content = chat.messages[0].content as any[];
      expect(content).toHaveLength(3);
      expect(content[0].type).toBe("text");
      expect(content[1].type).toBe("file");
      expect(content[1].file).toBe(mockImageFile);
      expect(content[2].type).toBe("file");
      expect(content[2].file).toBe(mockPdfFile);
    });
  });

  describe("helper methods", () => {
    const imageFile: FileInfo = {
      path: "/test/image.jpg",
      base64: "base64data",
      mimeType: "image/jpeg",
      size: 1000,
      name: "image.jpg",
      type: "image",
    };

    test("getTextContent extracts text from string content", () => {
      const chat = new Chat();
      const text = chat.getTextContent("Hello world");
      
      expect(text).toBe("Hello world");
    });

    test("getTextContent extracts text from multimodal content", () => {
      const chat = new Chat();
      const content = [
        { type: "text", text: "Hello" },
        { type: "text", text: "world" },
        { type: "file", file: imageFile }
      ];
      
      const text = chat.getTextContent(content as any);
      expect(text).toBe("Hello world");
    });

    test("getFiles returns empty array for string content", () => {
      const chat = new Chat();
      const files = chat.getFiles("Hello world");
      
      expect(files).toEqual([]);
    });

    test("getFiles extracts files from multimodal content", () => {
      const chat = new Chat();
      const content = [
        { type: "text", text: "Hello" },
        { type: "file", file: imageFile }
      ];
      
      const files = chat.getFiles(content as any);
      expect(files).toHaveLength(1);
      expect(files[0]).toBe(imageFile);
    });

    test("getFiles with multiple files", () => {
      const chat = new Chat();
      const documentFile: FileInfo = {
        path: "/test/document.pdf",
        base64: "base64data",
        mimeType: "application/pdf",
        size: 2000,
        name: "document.pdf",
        type: "document",
      };
      
      const content = [
        { type: "text", text: "Hello" },
        { type: "file", file: imageFile },
        { type: "file", file: documentFile }
      ];
      
      const files = chat.getFiles(content as any);
      expect(files).toHaveLength(2);
      expect(files[0]).toBe(imageFile);
      expect(files[1]).toBe(documentFile);
    });
  });

  describe("toString", () => {
    test("serializes chat to JSON string", () => {
      const chat = new Chat();
      chat.addSystem("System message");
      chat.addUser("User message");
      
      const result = chat.toString();
      const parsed = JSON.parse(result);
      
      expect(parsed.system).toBe("System message");
      expect(parsed.messages).toHaveLength(1);
      expect(parsed.tools).toEqual([]);
    });
  });
});