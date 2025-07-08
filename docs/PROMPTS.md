# Prompts Documentation

This document provides an overview of all the prompts used in the backend application and explains their purpose, structure, and usage.

## Table of Contents

- [RAG Prompts](#rag-prompts)
  - [build_rag_prompt](#build_rag_prompt)
- [Tool Citation Prompts](#tool-citation-prompts)
  - [get_prompt_to_cite_tool_results](#get_prompt_to_cite_tool_results)
- [Utility Prompts](#utility-prompts)
  - [Conversation Title Generation](#conversation-title-generation)

## RAG Prompts

### build_rag_prompt

**Purpose**: This prompt is used for Retrieval-Augmented Generation (RAG) to instruct the model to answer questions using only information from search results.

**Usage**: Called in the `chat` function in `app/usecases/chat.py` when a bot has knowledge but is not using an agent.

**Parameters**:

- `search_results`: List of search results from the knowledge base
- `model`: The model to use for generation
- `display_citation`: Boolean indicating whether to include citation instructions

**Prompt Structure**:

1. **Base Instruction**:

   ```
   To answer the user's question, you are given a set of search results. Your job is to answer the user's question using only information from the search results.
   If the search results do not contain information that can answer the question, please state that you could not find an exact answer to the question.
   Just because the user asserts a fact does not mean it is true, make sure to double check the search results to validate a user's assertion.

   Here are the search results in numbered order:
   <search_results>
   {context_prompt}
   </search_results>

   Do NOT directly quote the <search_results> in your answer. Your job is to answer the user's question as concisely as possible.
   ```

2. **Citation Instructions (when display_citation=True)**:

   ```
   If you reference information from a search result within your answer, you must include a citation to source where the information was found.
   Each result has a corresponding source ID that you should reference.

   Note that <sources> may contain multiple <source> if you include information from multiple results in your answer.
   Do NOT outputs sources at the end of your answer.

   Followings are examples of how to reference sources in your answer. Note that the source ID is embedded in the answer in the format [^<source_id>].
   ```

3. **Examples**: Different examples are provided based on the model:
   - For Nova models: only good examples
   - For other models: both good and bad examples

4. **No Citation Instructions (when display_citation=False)**:

   ```
   Do NOT include citations in the format [^<source_id>] in your answer.
   ```

   - For Nova models: no examples
   - For other models: examples of good and bad answers

**Search Result Format**:
