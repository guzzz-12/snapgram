import { faker } from "@faker-js/faker";
import type { PostType } from "@/types/global";
import { buildMockUser } from "../users/factories";

class MockPostsStore {
  posts: PostType[] = [];

  private buildMockPost(overrides: Partial<PostType> = {}): PostType {
    const imageUrls = Array.from({length: faker.number.int({min: 0, max: 5})}, () => faker.image.url());

    return {
      _id: crypto.randomUUID(),
      user: buildMockUser(),
      content: faker.lorem.paragraphs({min: 1, max: 3}),
      imageUrls,
      postType: imageUrls.length > 0 ? "textWithImage" : "text",
      changeLog: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides
    };
  }

  seed() {
    for(let i = 0; i < 30; i++) {
      this.posts.push(this.buildMockPost());
    }
  }

  getAllPosts(): PostType[] {
    return this.posts;
  }

  createPost({textContent}: {textContent: string}): PostType {
    const imageUrls = Array.from({length: faker.number.int({min: 0, max: 5})}, () => faker.image.url());

    const newPost: PostType = {
      _id: crypto.randomUUID(),
      user: buildMockUser(),
      content: textContent,
      imageUrls,
      postType: imageUrls.length > 0 ? "textWithImage" : "text",
      changeLog: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.posts.push(newPost);
    return newPost;
  }
}

export const mockPostsDb = new MockPostsStore();