import asyncio

async def test_func():
    print("Test func")

def get_lifespan():
    async def lifespan(app):
        print("Starting")
        asyncio.create_task(background_monitor())
        yield
    return lifespan

async def background_monitor():
    print("Background monitor running")

if __name__ == "__main__":
    print("OK")
