# MindMap AI

## Overview
MindMap AI is an intelligent web application designed to help students and professionals quickly digest large documents. By simply uploading a study PDF, the application extracts the text and uses Google's Gemini AI to automatically generate an interactive, visual mind map of the core concepts.

## Key Features
- **PDF Processing**: Upload any standard PDF document and extract its textual content seamlessly.
- **AI-Powered Generation**: Utilizes Google's Gemini AI to analyze the text, identify main topics, subtopics, and key details, and structure them logically.
- **Interactive Visualization**: View and interact with the generated mind map using a drag-and-drop interface powered by React Flow.
- **Cloud Storage**: All generated mind maps are securely saved to your personal account using Firebase Firestore, allowing you to revisit them anytime.
- **Secure Authentication**: Supports Google Sign-In and Email/Password authentication to keep your data private.

## How It Works
1. **Sign In**: Create an account or log in using Google.
2. **Upload PDF**: Go to the dashboard and upload your study material (PDF format).
3. **Generate**: The app reads the PDF, sends the text to the AI, and builds a structured JSON representation of the mind map.
4. **Interact**: The JSON is converted into an interactive visual graph that you can explore, rearrange, and save.
