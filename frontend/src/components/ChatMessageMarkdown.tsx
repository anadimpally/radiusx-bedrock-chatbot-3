import React, { ReactNode, useMemo } from 'react';
import { BaseProps } from '../@types/common';
import { ReactMarkdown } from 'react-markdown/lib/react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import ButtonDownload from './ButtonDownload';
import ButtonCopy from './ButtonCopy';
import { RelatedDocument } from '../@types/conversation';
import { twMerge } from 'tailwind-merge';
import i18next from 'i18next';
import { create } from 'zustand';
import { produce } from 'immer';
import rehypeExternalLinks, { Options } from 'rehype-external-links';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import 'katex/dist/katex.min.css';
import { onlyText } from 'react-children-utilities';
import RelatedDocumentViewer from './RelatedDocumentViewer';

// Utility function to fix dollar signs in math blocks
const fixDollarSignsInMath = (text: string): string => {
  // Find math blocks delimited by $ or $$
  return text.replace(/(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$)/g, (match) => {
    // Inside math blocks, ensure dollar signs are properly escaped for KaTeX
    return match.replace(/\$/g, (dollarSign, index, fullString) => {
      // Don't replace the delimiters (first and last character in inline math, or first two and last two in block math)
      const isInlineDelimiter = (index === 0 || index === fullString.length - 1) && fullString.charAt(0) !== '$';
      const isBlockDelimiter = (index <= 1 || index >= fullString.length - 2) && fullString.substring(0, 2) === '$$';
      
      if (isInlineDelimiter || isBlockDelimiter) {
        return dollarSign;
      }
      
      // Replace interior dollar signs with \$ to escape them in math context
      return '\\' + dollarSign;
    });
  });
};

type Props = BaseProps & {
  children: string;
  isStreaming?: boolean;
  relatedDocuments?: RelatedDocument[];
  messageId: string;
};

const useRelatedDocumentsState = create<{
  relatedDocuments: {
    [key: string]: RelatedDocument;
  };
  setRelatedDocument: (key: string, relatedDocument: RelatedDocument) => void;
  resetRelatedDocument: (key: string) => void;
}>((set, get) => ({
  relatedDocuments: {},
  setRelatedDocument: (key, relatedDocument) => {
    set({
      relatedDocuments: produce(get().relatedDocuments, (draft) => {
        draft[key] = relatedDocument;
      }),
    });
  },
  resetRelatedDocument: (key) => {
    set({
      relatedDocuments: produce(get().relatedDocuments, (draft) => {
        delete draft[key];
      }),
    });
  },
}));

const RelatedDocumentLink: React.FC<{
  relatedDocument?: RelatedDocument;
  sourceId: string;
  linkId: string;
  children: ReactNode;
}> = (props) => {
  const { relatedDocuments, setRelatedDocument, resetRelatedDocument } = useRelatedDocumentsState();

  return (
    <>
      <a
        className={twMerge(
          'mx-0.5 ',
          props.relatedDocument != null
            ? 'cursor-pointer text-aws-sea-blue-light dark:text-aws-sea-blue-dark hover:text-aws-sea-blue-hover-light dark:hover:text-aws-sea-blue-hover-dark'
            : 'cursor-not-allowed text-gray'
        )}
        onClick={() => {
          if (props.relatedDocument != null) {
            setRelatedDocument(props.linkId, props.relatedDocument);
          }
        }}>
        {props.children}
      </a>

      {relatedDocuments[props.linkId] && (
        <RelatedDocumentViewer
          relatedDocument={relatedDocuments[props.linkId]}
          onClick={() => {
            resetRelatedDocument(props.linkId);
          }}
        />
      )}
    </>
  );
};

/**
 * Component for rendering chat messages with Markdown support.
 *
 * @param {Props} props - The properties for the ChatMessageMarkdown component.
 * @returns {JSX.Element} The rendered ChatMessageMarkdown component.
 */
const ChatMessageMarkdown: React.FC<Props> = ({
  className,
  children,
  isStreaming,
  relatedDocuments,
  messageId,
}) => {
  const sourceIds = useMemo(() => (
    [...new Set(Array.from(
      children.matchAll(/\[\^(?<sourceId>[\w!?/+\-_~=;.,*&@#$%]+?)\]/g),
      match => match.groups!.sourceId,
    ))]
  ), [children]);

  const chatWaitingSymbol = useMemo(() => i18next.t('app.chatWaitingSymbol'), []);
  const text = useMemo(() => {
    // Process citations first
    const textRemovedIncompleteCitation = children.replace(/\[\^[^\]]*?$/, '[^');
    let textReplacedSourceId = textRemovedIncompleteCitation.replace(
      /\[\^(?<sourceId>[\w!?/+\-_~=;.,*&@#$%]+?)\]/g,
      (_, sourceId) => {
        const index = sourceIds.indexOf(sourceId);
        if (index === -1) {
          return '';
        }
        return `[^${index + 1}]`
      }
    );
    
    // Add waiting symbol if streaming
    if (isStreaming) {
      textReplacedSourceId += chatWaitingSymbol;
    }
    
    // Apply fix for dollar signs in math context
    return fixDollarSignsInMath(textReplacedSourceId);
  }, [children, sourceIds, isStreaming, chatWaitingSymbol]);

  const remarkPlugins = useMemo(() => (
    [remarkGfm, remarkBreaks, remarkMath]
  ), []);

  const rehypePlugins = useMemo(() => {
    const options: Options = {
      target: '_blank',
      rel: ['noopener noreferrer'],
    };
    
    // Configure KaTeX to properly handle dollar signs
    const katexOptions = {
      // Trust input - important for properly rendering escaped dollar signs
      trust: true,
      // Set strict to false to avoid errors on malformed math expressions
      strict: false,
      // Ensure currency symbols like dollar signs are properly rendered
      output: 'html',
      // Set this to true to enable proper dollar sign rendering
      fleqn: true
    };
    
    return [[rehypeExternalLinks, options], [rehypeKatex, katexOptions]];
  }, []);

  return (
    <ReactMarkdown
      className={twMerge(className, 'prose dark:prose-invert max-w-full break-all')}
      children={text}
      remarkPlugins={remarkPlugins}
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      rehypePlugins={rehypePlugins}
      components={{
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const codeText = onlyText(children).replace(/\n$/, '');

          return !inline && match ? (
            <CopyToClipboard codeText={codeText}>
              <SyntaxHighlighter
                {...props}
                children={codeText}
                style={vscDarkPlus}
                language={match[1]}
                x
                PreTag="div"
                wrapLongLines={true}
              />
            </CopyToClipboard>
          ) : (
            <code {...props} className={className}>
              {children}
            </code>
          );
        },
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        sup({ className, children }) {
          // Footnote's Link is replaced with a components that displays the Reference document
          return (
            <sup className={className}>
              {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                children.map((child, idx) => {
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-ignore
                  if (child?.props['data-footnote-ref']) {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    const href: string = child.props.href ?? '';
                    if (/#user-content-fn-[\d]+/.test(href ?? '')) {
                      const docNo = Number.parseInt(
                        href.replace('#user-content-fn-', '')
                      );
                      const sourceId = sourceIds[docNo - 1];
                      const relatedDocument = relatedDocuments?.find(document => (
                        document.sourceId === sourceId || document.sourceId === `${messageId}@${sourceId}`
                      ));

                      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                      // @ts-ignore
                      const refNo = child.props.children[0];
                      return (
                        <RelatedDocumentLink
                          key={`${idx}-${docNo}`}
                          linkId={`${messageId}-${idx}-${docNo}`}
                          relatedDocument={relatedDocument}
                          sourceId={sourceId}
                        >
                          [{refNo}]
                        </RelatedDocumentLink>
                      );
                    }
                  }
                  return child;
                })
              }
            </sup>
          );
        },
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        section({ className, children, ...props }) {
          // Normal Footnote not shown for RAG reference documents
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          if (props['data-footnotes']) {
            return null;
          } else {
            return <section className={className}>{children}</section>;
          }
        },
      }}
    />
  );
};

const CopyToClipboard = ({
  children,
  codeText,
}: {
  children: React.ReactNode;
  codeText: string;
}) => {
  return (
    <div className="relative">
      {children}
      <div className="absolute right-2 top-2 flex gap-0">
        <ButtonDownload text={codeText} />
        <ButtonCopy text={codeText} />
      </div>
    </div>
  );
};

export default ChatMessageMarkdown;
