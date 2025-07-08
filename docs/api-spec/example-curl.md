
## API Examples - Curl commands to test the API

### Start a New Conversation (First Message)

'''
curl -X POST "<https://7pg9r2dlcc.execute-api.us-east-1.amazonaws.com/api/conversation>" \
  -H "Content-Type: application/json" \
  -H "x-api-key: H7UI4czPRX7mxrlg67v7tCPL1XnBx5y90p4ieSZ8" \
  -d '{
    "message": {
      "content": [
        {
          "contentType": "text",
          "body": "Hello, can you help me understand how machine learning works?"
        }
      ],
      "model": "claude-v3-haiku"
    },
    "conversationId": null
  }'
'''

#### example answer

'''
{"conversationId":"01JNGKMHA1KK5NNSJKXHYS10FY","messageId":"01JNGKMHA1M7YGD8VH0PN9V7T1"}
'''


### Continue a Conversation (Subsequent Messages)

'''
curl -X POST "<https://7pg9r2dlcc.execute-api.us-east-1.amazonaws.com/api/conversation>" \
  -H "Content-Type: application/json" \
  -H "x-api-key: H7UI4czPRX7mxrlg67v7tCPL1XnBx5y90p4ieSZ8" \
  -d '{
    "message": {
      "content": [
        {
          "contentType": "text",
          "body": "Thanks for the explanation. Can you tell me more about neural networks specifically?"
        }
      ],
      "model": "claude-v3-haiku"
    },
    "conversationId": "01JNGKMHA1KK5NNSJKXHYS10FY"
  }'
'''

#### example answer

'''
{"conversationId":"01JNGKMHA1KK5NNSJKXHYS10FY","messageId":"01JNGKSB1H77J9KF5TQ5NRY6PX"}
'''

### Get a Message from a Conversation

'''
curl -X GET "<https://7pg9r2dlcc.execute-api.us-east-1.amazonaws.com/api/conversation/01JNGKMHA1KK5NNSJKXHYS10FY/01JNGKSB1H77J9KF5TQ5NRY6PX>" \
  -H "x-api-key: H7UI4czPRX7mxrlg67v7tCPL1XnBx5y90p4ieSZ8"
'''

#### example answer

'''
{"conversationId":"01JNGKMHA1KK5NNSJKXHYS10FY","message":{"role":"assistant","content":[{"contentType":"text","body":"Sure, here's more detail on how neural networks work:\n\nNeural networks are a type of machine learning model that are inspired by the structure and function of the human brain. They are composed of interconnected nodes, called neurons, that can transmit signals to other neurons. [^3][^2]\n\nThe basic structure of a neural network consists of an input layer, one or more hidden layers, and an output layer. The input layer receives the data, the hidden layers perform feature extraction and transformation, and the output layer produces the predictions. [^3][^2]\n\nEach connection between neurons has an associated weight, and the network \"learns\" by adjusting these weights during the training process. This is done using an optimization algorithm like gradient descent, which minimizes the error between the network's outputs and the true labels in the training data. [^3][^16]\n\nSome key characteristics of neural networks include:\n\n- They can learn complex, non-linear relationships in data without requiring explicit feature engineering. [^3]\n- They are well-suited for tasks like image recognition, natural language processing, and speech recognition. [^8][^9]\n- Training neural networks can be computationally intensive and require large amounts of training data. [^16][^17]\n- Architectural choices like the number and size of hidden layers, activation functions, and regularization techniques can significantly impact performance. [^3][^16]\n\nOverall, neural networks are a powerful machine learning technique that have seen great success in a variety of real-world applications. Let me know if you need any clarification or have additional questions!"}],"model":"claude-v3-haiku","children":[],"feedback":null,"usedChunks":null,"parent":"01JNGKSB1H77J9KF5TQ5NRY6PX","thinkingLog":null},"createTime":1741092966012.0}
'''
