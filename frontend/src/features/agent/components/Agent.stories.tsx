import { useState } from 'react';
import { AvailableTools } from './AvailableTools'; // Component to display available tools
import { AgentTool } from '../types'; // Type definition for AgentTool
import ToolCard from './ToolCard'; // Component to display a tool card
import AgentToolList from './AgentToolList'; // Component to display a list of tools

// Component to display available tools
export const Tools = () => {
  const availableTools: AgentTool[] = [
    { name: 'get_weather', description: '' },
    { name: 'sql_db_query', description: '' },
    { name: 'sql_db_schema', description: '' },
    { name: 'sql_db_list_tables', description: '' },
    { name: 'sql_db_query_checker', description: '' },
    { name: 'internet_search', description: '' },
    { name: 'knowledge_base_tool', description: '' },
  ];
  const [tools, setTools] = useState<AgentTool[]>([]); // State to manage selected tools
  return (
    <AvailableTools
      availableTools={availableTools}
      tools={tools}
      setTools={setTools}
    />
  );
};

// Component to display a running tool card
export const ToolCardRunning = () => (
  <ToolCard
    toolUseId="tool1_tcr"
    name="internet_search"
    status="running"
    input={{ country: 'jp-jp', query: '東京 天気', time_limit: 'd' }}
  />
);

// Component to display a successful tool card
export const ToolCardSuccess = () => (
  <ToolCard
    toolUseId="tool2_tcs"
    name="Database Query"
    status="success"
    input={{ query: 'SELECT * FROM table' }}
    resultContents={[{ text: 'some data' }]}
  />
);

// Component to display an error tool card
export const ToolCardError = () => (
  <ToolCard
    toolUseId="tool3_tce"
    name="API Call"
    status="error"
    input={{ query: 'SELECT * FROM table' }}
  />
);

// Component to display a list of running tools
export const ToolListRunning = () => {
  return <AgentToolList
    messageId="message_tlr"
    tools={{
      tools: {
        tool1_tlr: {
          name: 'internet_search',
          status: 'running',
          input: { country: 'jp-jp', query: '東京 天気', time_limit: 'd' },
        },
        tool2_tlr: {
          name: 'database_query',
          status: 'success',
          input: { query: 'SELECT * FROM table' },
          resultContents: [{ text: '{"result": "success", "data": "some data"}' }],
        },
        tool3_tlr: {
          name: 'API Call',
          status: 'running',
          input: { country: 'jp-jp', query: '東京 天気', time_limit: 'd' },
        },
      },
    }}
  />;
};

// Component to display a list of tools with results
export const ToolList = () => {
  return <AgentToolList
    messageId="message_tl"
    tools={{
      thought: '東京の天気について以下のことがわかりました。\n- search result 1[^tool1_tl@0]\n- search result 2[^tool1_tl@1]\n- search result 3[^tool1_tl@2]',
      tools: {
        tool1_tl: {
          name: 'internet_search',
          status: 'success',
          input: { country: 'jp-jp', query: '東京 天気', time_limit: 'd' },
          resultContents: [
            { text: "search result 1" },
            { text: "search result 2" },
            { text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat." },
          ],
        },
        tool2_tl: {
          name: 'database_query',
          status: 'success',
          input: { query: 'SELECT * FROM table' },
          resultContents: [{ text: '{"result": "success", "data": "some data"}' }],
        },
        tool3_tl: {
          name: 'API Call',
          status: 'error',
          input: { country: 'jp-jp', query: '東京 天気', time_limit: 'd' },
          resultContents: [{ text: 'Error! Connection Timeout' }],
        },
      },
    }}
    relatedDocuments={[
      {
        content: { text: 'search result 1' },
        sourceId: 'tool1_tl@0',
        sourceName: 'internet_search',
      },
      {
        content: { text: 'search result 2' },
        sourceId: 'tool1_tl@1',
        sourceName: 'internet_search',
      },
      {
        content: { text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.' },
        sourceId: 'tool1_tl@2',
        sourceName: 'internet_search',
      },
    ]}
  />;
};
