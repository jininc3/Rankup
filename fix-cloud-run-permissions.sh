#!/bin/bash

# Fix Cloud Run permissions for Firebase Functions v2
# This allows your React Native app to call the Cloud Functions

echo "Setting up Cloud Run permissions..."

# Set the project
gcloud config set project rankup-a2a8a

# Allow public invocation for linkRiotAccount
echo "Setting permissions for linkRiotAccount..."
gcloud run services add-iam-policy-binding linkriotaccount \
  --region=us-central1 \
  --member=allUsers \
  --role=roles/run.invoker

# Allow public invocation for getRiotStats
echo "Setting permissions for getRiotStats..."
gcloud run services add-iam-policy-binding getriotstats \
  --region=us-central1 \
  --member=allUsers \
  --role=roles/run.invoker

echo "Done! Your functions should now be accessible from your React Native app."
echo "Note: The functions still require Firebase Authentication internally."
