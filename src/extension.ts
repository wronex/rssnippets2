/*
 * Copyright (c) Microsoft Corporation
 * Copyright (c) wronex
 * 
 * All rights reserved. 
 * 
 * MIT License
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy 
 * of this software and associated documentation files (the "Software"), to deal 
 * in the Software without restriction, including without limitation the rights 
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell 
 * copies of the Software, and to permit persons to whom the Software is 
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in 
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE 
 * SOFTWARE.
 */

import * as vscode from 'vscode';
import fs = require('fs');
import path = require('path');

class FieldDetails
{
	Name!: string;
	Type! : string;
	IsStatic! : boolean;
	IsConst! : boolean;
}

class MethodDetails
{
	Name! : string;
	ReturnType! : string;
	Arguments! : string[];
	IsStatic! : boolean;
	IsConstructor! : boolean;
}

class ClassDetails
{
	Name! : string;
	Methods! : MethodDetails[];
	Fields! : FieldDetails[];
}

function getCompletionItems(apiClasses: ClassDetails[], className: string): vscode.CompletionItem[]
{
	let items : vscode.CompletionItem[] = [];
	let classDetails : ClassDetails | null = null;
	
	for (let index = 0; index < apiClasses.length; index++) 
	{
		classDetails = apiClasses[index];
		if (classDetails.Name == className)
		{
			break;
		}
	}
	
	if (classDetails)
	{
		for (let i = 0; i < classDetails.Fields.length; i++)
		{
			const field : FieldDetails = classDetails.Fields[i];
			
			let item = new vscode.CompletionItem(field.Name, vscode.CompletionItemKind.Field);
			item.documentation = new vscode.MarkdownString('`' + field.Type + ' ' + field.Name + '`');
			
			items.push(item);
		}
		
		for (let i = 0; i < classDetails.Methods.length; i++)
		{
			const method : MethodDetails = classDetails.Methods[i];
			if (!method.IsConstructor)
			{
				let item = new vscode.CompletionItem(method.Name, vscode.CompletionItemKind.Method);
				item.documentation = new vscode.MarkdownString('`' + method.Name + '(' + method.Arguments.join(", ") + ')`');
				
				items.push(item);
			}
		}
	}
	
	return items;
}

export function activate(context: vscode.ExtensionContext) 
{
	let apiFileName = path.join(context.extensionPath, 'ravenscript_api.json');
	let apiJson = JSON.parse(fs.readFileSync(apiFileName).toString());
	let apiClasses : ClassDetails[] = apiJson.Classes;
	
	let typeNames : vscode.CompletionItem[] = [];
	for (let index = 0; index < apiClasses.length; index++) 
	{
		const classDetails : ClassDetails = apiClasses[index];		
		const item = new vscode.CompletionItem(classDetails.Name);
		item.commitCharacters = ['.'];
		//item.documentation = new vscode.MarkdownString('Press `.` to get `' + classDetails.Name + '.`');
		typeNames.push(item);
	}
	
	let gameObject = getCompletionItems(apiClasses, "GameObject");
	let transform = getCompletionItems(apiClasses, "Transform");
	
	let typeProvider = vscode.languages.registerCompletionItemProvider(
		'lua', 
		{
			provideCompletionItems() 
			{
				return typeNames;
			}
		}
	);
	
	const selfProvider = vscode.languages.registerCompletionItemProvider(
		'lua',
		{
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) 
			{

				// get all text until the `position` and check if it reads `self.`
				// and if so then complete with ...
				let linePrefix = document.lineAt(position).text.substr(0, position.character);
				if (!linePrefix.endsWith('self.')) 
				{
					return undefined;
				}

				return [
					new vscode.CompletionItem('transform', vscode.CompletionItemKind.Field),
					new vscode.CompletionItem('gameObject', vscode.CompletionItemKind.Field),
					new vscode.CompletionItem('script', vscode.CompletionItemKind.Field),
					new vscode.CompletionItem('targets', vscode.CompletionItemKind.Field),
				];
			}
		},
		'.' // triggered whenever a '.' is being typed
	);
	
	const gameObjectProvider = vscode.languages.registerCompletionItemProvider(
		'lua',
		{
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) 
			{
				let linePrefix = document.lineAt(position).text.substr(0, position.character);
				if (!linePrefix.endsWith('gameObject.')) 
				{
					return undefined;
				}

				return gameObject;
			}
		},
		'.' // triggered whenever a '.' is being typed
	);
	
	const transformProvider = vscode.languages.registerCompletionItemProvider(
		'lua',
		{
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
				let linePrefix = document.lineAt(position).text.substr(0, position.character);
				if (!linePrefix.endsWith('transform.')) 
				{
					return undefined;
				}

				return transform;
			}
		},
		'.' // triggered whenever a '.' is being typed
	);
	
	// Add a provider for each class that report its static methods and fields.
	for (let index = 0; index < apiClasses.length; index++)
	{
		const classDetails : ClassDetails = apiClasses[index];	
		let items : vscode.CompletionItem[] = [];
		
		for (let i = 0; i < classDetails.Fields.length; i++)
		{
			const field : FieldDetails = classDetails.Fields[i];
			if (field.IsStatic)
			{
				let item = new vscode.CompletionItem(field.Name, vscode.CompletionItemKind.Field);
				item.documentation = new vscode.MarkdownString('`' + field.Type + ' ' + field.Name + '`');
				
				items.push(item);
			}
		}
		
		for (let i = 0; i < classDetails.Methods.length; i++)
		{
			const method : MethodDetails = classDetails.Methods[i];
			if (!method.IsConstructor && method.IsStatic)
			{
				let item = new vscode.CompletionItem(method.Name, vscode.CompletionItemKind.Method);
				item.documentation = new vscode.MarkdownString('`' + method.Name + '(' + method.Arguments.join(", ") + ')`');
				
				items.push(item);
			}
		}
		
		if (items.length > 0)
		{
			const provider = vscode.languages.registerCompletionItemProvider(
				'lua',
				{
					provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
		
						// get all text until the `position` and check if it reads `transform.`
						// and if so then complete with ...
						let linePrefix = document.lineAt(position).text.substr(0, position.character);
						if (!linePrefix.endsWith(classDetails.Name + '.')) 
						{
							return undefined;
						}
		
						return items;
					}
				},
				'.' // triggered whenever a '.' is being typed
			);
			
			context.subscriptions.push(provider);
		}
	}

	context.subscriptions.push(
		typeProvider, 
		selfProvider, 
		gameObjectProvider, 
		transformProvider
	);
	
	
}
