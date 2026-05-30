import os
from transformers import CLIPProcessor, CLIPModel, pipeline

def download():
    print("Downloading CLIP model (openai/clip-vit-base-patch32)...")
    model_name = "openai/clip-vit-base-patch32"
    CLIPProcessor.from_pretrained(model_name)
    CLIPModel.from_pretrained(model_name)
    print("CLIP model downloaded successfully.")

    print("\nDownloading Zero-shot classification model (facebook/bart-large-mnli)...")
    zero_shot_model = "facebook/bart-large-mnli"
    pipeline("zero-shot-classification", model=zero_shot_model)
    print("Zero-shot model downloaded successfully.")

if __name__ == "__main__":
    download()
