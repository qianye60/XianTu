# NAI 生图 API 接入说明

## 接口与鉴权

- Base URL：`https://create.suanbohe.com/api`
- 生图：`POST /ai/generate-image`
- 模型列表：`GET /models`，读取返回的 `data[].id` 作为模型 ID。
- API Key：在本站创建的 NovelAI 系列密钥。

两个接口均使用请求头：

```http
Authorization: Bearer <API Key>
```

模型包括以下型号，实际可用范围以模型列表为准：

```text
nai-diffusion-4-5-full
nai-diffusion-4-5-curated
nai-diffusion-5-full
nai-diffusion-5-curated
```

## 生图请求

完整地址：`https://create.suanbohe.com/api/ai/generate-image`

请求方法：`POST`

请求头：

```http
Authorization: Bearer <API Key>
Content-Type: application/json
Accept: application/json
Idempotency-Key: <本次生成的唯一UUID>
```

请求体：

```json
{
  "input": "1girl, garden, watercolor",
  "model": "nai-diffusion-4-5-full",
  "action": "generate",
  "parameters": {
    "width": 1024,
    "height": 1024,
    "steps": 23,
    "scale": 7,
    "seed": 42,
    "n_samples": 1,
    "uc": "low quality, blurry"
  }
}
```

| 字段 | 含义 |
| --- | --- |
| `input` | 正面提示词 |
| `model` | 模型 ID |
| `action` | 固定为 `generate` |
| `parameters.width` / `height` | 图片宽高，单位为像素 |
| `parameters.steps` | 步数 |
| `parameters.scale` | 提示词引导强度 |
| `parameters.seed` | 随机种子；省略或传 `-1` 表示随机，固定种子可用 0–4294967295 的整数 |
| `parameters.n_samples` | 固定为整数 `1` |
| `parameters.uc` | 负面提示词 |

## 成功返回

HTTP 状态码：`201`。

指定 `Accept: application/json` 时：

```json
{
  "images": [
    {
      "image": "<PNG图片的Base64内容>",
      "index": 0,
      "seed": 42
    }
  ]
}
```

`images[0].image` 为纯 Base64，解码后得到 PNG 图片；`seed` 为实际使用的种子。

不指定 `Accept: application/json` 时，默认返回 `application/zip`，压缩包内为 `image_0.png`。

## 限制与重试

- 支持文字生图，每次一张；暂不支持图生图、参考图、蒙版和放大。
- 宽高必须为 64 的倍数，总像素不超过 1,048,576，步数最多 28。
- 每次新生成使用新的 `Idempotency-Key`；同一次生成的网络重试保留原键和原请求体，避免重复生成、扣费。同键提交不同生成参数会返回冲突。
- 请求会等待排队与生成结果。客户端超时不代表服务端任务已取消，不要因此换新键自动重发。

## 错误返回

```json
{
  "statusCode": 400,
  "message": "具体错误原因",
  "code": "错误代码"
}
```

常见 HTTP 状态：`400` 参数错误、`401` 密钥无效、`403` 权限不足、`402` 额度或积分不足、`409` 请求冲突、`429` 暂时受限、`503` 服务暂不可用。具体原因以返回的 `message` 和 `code` 为准。

连接测试使用 `GET https://create.suanbohe.com/api/models`，带同一 Bearer Key，不会触发生图。
